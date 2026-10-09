"""
Figure extraction for AI notes (EXPERIMENTAL).

Reads a PDF top-to-bottom and returns:
  - the text, with [[FIGURE <key>]] markers where figures sit
  - the figure images (JPEG bytes), capped by count and total size

Nothing here touches the database, Supabase or Gemini.
"""
import re
from dataclasses import dataclass

try:
    import pymupdf as fitz
except ImportError:  # older PyMuPDF versions
    import fitz

# ---------------- Tunable settings ----------------
SHAPE_THRESHOLD = 15            # drawn shapes on a page to call it a "diagram page"
MIN_IMAGE_PIXELS = 120          # ignore pictures smaller than this (icons, bullets)
MIN_IMAGE_AREA_RATIO = 0.04     # ignore pictures covering < 4% of the page
MAX_IMAGE_AREA_RATIO = 0.85     # ignore pictures covering > 85% (scanned/exported pages)
REPEAT_RATIO = 0.4              # appears on > 40% of pages = template (logo, footer)
MIN_PAGES_FOR_REPEAT_CHECK = 4  # only check repeats in documents with >= 4 pages
MAX_FIGURES = 15                # per extraction call
MAX_TOTAL_BYTES = 3 * 1024 * 1024
RENDER_WIDTH = 1000             # px width of saved images
JPEG_QUALITY = 70
MAX_CLASSIFY = 45               # at most this many candidates are sent to the classifier
THUMB_WIDTH = 320               # px width of the thumbnails sent to Gemini
DIAGRAM_PAGES_ENABLED = False   # render pages whose diagrams are drawn shapes (rare in your PDFs)

@dataclass
class Figure:
    key: str            # e.g. "p5_1" (plus optional prefix)
    kind: str           # "image" (extracted picture) | "page" (rendered page)
    page: int           # 1-based page number
    score: float        # used for ranking when over the cap
    xref: int = 0
    bbox: tuple | None = None
    data: bytes = b""   # JPEG bytes (filled only for kept figures)
    data: bytes = b""   # JPEG bytes (filled only for kept figures)
    caption: str = ""   # text next to the figure, usually "Figure 3.2: ..."


@dataclass
class ExtractionResult:
    text: str
    figures: list
    stats: dict


def detect_diagram_page(shape_count: int) -> bool:
    """
    Decides whether a page is a diagram page.
    Kept as its own function so it can later be replaced
    (for example by a Gemini-per-slide check) without touching the rest.
    """
    return shape_count >= SHAPE_THRESHOLD


def _sig(rect):
    """Rough position/size signature of a shape, used to spot repeated template shapes."""
    return (round(rect.x0 / 5), round(rect.y0 / 5), round(rect.width / 5), round(rect.height / 5))


MIN_SHAPE_SIZE = 3      # pts; thinner shapes are borders/underlines, not diagram parts
GRID_RATIO = 0.5        # above this, the shapes form a table-like grid


def _table_rects(page):
    try:
        return [fitz.Rect(t.bbox) for t in page.find_tables().tables]
    except Exception:
        return []


def _page_drawings(page):
    page_area = page.rect.width * page.rect.height
    tables = _table_rects(page)
    out = []

    for d in page.get_drawings():
        r = d["rect"]

        # thin lines: table borders, underlines, connector lines
        if min(r.width, r.height) < MIN_SHAPE_SIZE:
            continue

        # anything inside a detected table
        center = fitz.Point((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)
        if any(center in t for t in tables):
            continue

        ratio = (r.width * r.height) / page_area if page_area else 0
        out.append((_sig(r), ratio))

    # Grid check: table cells line up in rows and columns, scattered diagram boxes don't
    if len(out) >= 6:
        distinct_x = len({s[0] for s, _ in out})
        distinct_y = len({s[1] for s, _ in out})
        if len(out) / (distinct_x * distinct_y) > GRID_RATIO:
            return []

    return out

def _find_templates(doc, drawings_by_page):
    """Images and shapes that repeat on many pages (logos, footer bars)."""
    n = len(doc)
    if n < MIN_PAGES_FOR_REPEAT_CHECK:
        return set(), set()

    image_pages, shape_pages = {}, {}
    for i, page in enumerate(doc):
        for img in page.get_images(full=True):
            image_pages.setdefault(img[0], set()).add(i)
        for sig in {s for s, _ in drawings_by_page[i]}:
            shape_pages.setdefault(sig, set()).add(i)

    limit = n * REPEAT_RATIO
    repeated_images = {x for x, p in image_pages.items() if len(p) > limit}
    repeated_shapes = {s for s, p in shape_pages.items() if len(p) > limit}
    return repeated_images, repeated_shapes


def _render_clip(page, bbox):
    rect = fitz.Rect(bbox)
    scale = min(RENDER_WIDTH / rect.width, 3.0) if rect.width else 1.0
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), clip=rect, alpha=False)
    return pix.tobytes("jpeg", jpg_quality=JPEG_QUALITY)


def _build_bytes(doc, fig):
    """Creates the JPEG bytes for one figure. Leaves fig.data empty on failure."""
    page = doc[fig.page - 1]
    try:
        if fig.kind == "page":
            fig.data = _render_clip(page, page.rect)
            return

        info = doc.extract_image(fig.xref)
        if not info or info.get("smask"):
            # transparent images: render over a white background instead
            fig.data = _render_clip(page, fig.bbox)
            return

        pix = fitz.Pixmap(doc, fig.xref)
        if pix.n - pix.alpha not in (1, 3):      # e.g. CMYK
            pix = fitz.Pixmap(fitz.csRGB, pix)
        if pix.alpha:
            pix = fitz.Pixmap(pix, 0)
        while pix.width > RENDER_WIDTH * 1.5:
            pix.shrink(1)                         # halves the size
        fig.data = pix.tobytes("jpeg", jpg_quality=JPEG_QUALITY)
    except Exception:
        try:
            fig.data = _render_clip(page, fig.bbox or page.rect)
        except Exception:
            fig.data = b""


def _nearby_captions(page, bbox, max_gap=60):
    """Returns (text_above, text_below): the closest text blocks to a picture."""
    x0, y0, x1, y1 = bbox
    above, below = [], []
    for b in page.get_text("blocks", sort=True):
        if b[6] != 0 or not b[4].strip():
            continue
        if b[2] < x0 or b[0] > x1:       # must overlap the picture horizontally
            continue
        text = " ".join(b[4].split())
        if 0 <= b[1] - y1 <= max_gap:
            below.append((b[1], text))
        elif 0 <= y0 - b[3] <= max_gap:
            above.append((b[3], text))
    above.sort(reverse=True)
    below.sort()
    return (above[0][1] if above else ""), (below[0][1] if below else "")


def _is_table_caption(text):
    return bool(re.match(r"(?i)\s*table\b", text))

def _thumbnail(jpeg_bytes):
    pix = fitz.Pixmap(jpeg_bytes)
    while pix.width > THUMB_WIDTH * 1.5:
        pix.shrink(1)                 # halves the size
    return pix.tobytes("jpeg", jpg_quality=60)

def _spread(figs, limit):
    """If there are more figures than the limit, pick them evenly across the document."""
    figs = sorted(figs, key=lambda f: (f.page, f.key))
    n = len(figs)
    if n <= limit:
        return figs
    if limit <= 1:
        return figs[:limit]
    idx = sorted({round(i * (n - 1) / (limit - 1)) for i in range(limit)})
    return [figs[i] for i in idx]

def extract_with_figures(pdf_bytes: bytes, key_prefix: str = "", max_figures: int = MAX_FIGURES, classifier=None) -> ExtractionResult:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        return _extract(doc, key_prefix, max_figures, classifier)
    finally:
        doc.close()


def _extract(doc, key_prefix, max_figures, classifier):
    drawings_by_page = [_page_drawings(p) for p in doc]
    repeated_images, repeated_shapes = _find_templates(doc, drawings_by_page)

    pages = []        # per page: list of ("text", str) or ("fig", Figure)
    candidates = []
    page_shapes = {}

    for i, page in enumerate(doc):
        page_no = i + 1
        page_area = page.rect.width * page.rect.height
        items = []    # (y, x, kind, value)

        # text blocks (type 0), in reading order
        for b in page.get_text("blocks", sort=True):
            if b[6] == 0 and b[4].strip():
                items.append((b[1], b[0], "text", b[4].strip()))

        counter = 0
        page_has_image_fig = False

        # large embedded pictures
        for info in page.get_image_info(xrefs=True):
            xref = info.get("xref", 0)
            if not xref or xref in repeated_images:
                continue
            x0, y0, x1, y1 = info["bbox"]
            ratio = ((x1 - x0) * (y1 - y0)) / page_area if page_area else 0
            if ratio < MIN_IMAGE_AREA_RATIO or ratio > MAX_IMAGE_AREA_RATIO:
                continue
            if min(info.get("width", 0), info.get("height", 0)) < MIN_IMAGE_PIXELS:
                continue
            above, below = _nearby_captions(page, (x0, y0, x1, y1))
            if _is_table_caption(above) or _is_table_caption(below):
                continue            # a picture of a table, not a figure
            counter += 1
            fig = Figure(
                key=f"{key_prefix}p{page_no}_{counter}",
                kind="image", page=page_no,
                score=50 + ratio * 50,           # pictures outrank diagram pages
                xref=xref, bbox=(x0, y0, x1, y1),
                caption=(below or above)[:120],
            )
            candidates.append(fig)
            items.append((y0, x0, "fig", fig))
            page_has_image_fig = True

        # diagram pages (drawn shapes), only if the page has no picture figure already
        shape_count = 0
        if DIAGRAM_PAGES_ENABLED and not page_has_image_fig:
            shape_count = sum(
                1 for sig, ratio in drawings_by_page[i]
                if sig not in repeated_shapes and ratio <= 0.9
            )
            page_shapes[page_no] = shape_count
            if detect_diagram_page(shape_count):
                counter += 1
                fig = Figure(
                    key=f"{key_prefix}p{page_no}_{counter}",
                    kind="page", page=page_no,
                    score=min(shape_count, 100) / 2,
                    bbox=tuple(page.rect),
                )
                candidates.append(fig)
                items.append((page.rect.y1 + 1, 0, "fig", fig))   # marker at end of page text

        items.sort(key=lambda t: (t[0], t[1]))
        pages.append([(k, v) for _, _, k, v in items])

        # rank candidates; optionally let the classifier remove tables, code, logos, etc.
    ranked = sorted(candidates, key=lambda f: f.score, reverse=True)
    ai_info = {"sent_to_ai": 0, "approved_by_ai": 0, "ai_error": ""}

    if classifier is not None:
        pool = ranked[:MAX_CLASSIFY]
        for fig in pool:
            _build_bytes(doc, fig)
        pool = [f for f in pool if f.data]
        ai_info["sent_to_ai"] = len(pool)
        try:
            approved = classifier([(f.key, _thumbnail(f.data)) for f in pool]) if pool else set()
            pool = [f for f in pool if f.key in approved]
            ai_info["approved_by_ai"] = len(pool)
        except Exception as e:
            # classification failed: no figures this time, the notes continue as text only
            ai_info["ai_error"] = str(e)[:200]
            pool = []
    else:
        pool = ranked

    pool = _spread(pool, max_figures)

    kept, total = [], 0
    for fig in pool:
        if len(kept) >= max_figures:
            break
        if not fig.data:
            _build_bytes(doc, fig)
        if not fig.data:
            continue
        if total + len(fig.data) > MAX_TOTAL_BYTES:
            fig.data = b""
            continue
        kept.append(fig)
        total += len(fig.data)

    kept_keys = {f.key for f in kept}
    

    # build the text with markers only for kept figures
    page_texts = []
    for items in pages:
        parts = []
        for kind, val in items:
            if kind == "text":
                parts.append(val)
            elif val.key in kept_keys:
                parts.append(f"[[FIGURE {val.key}]]")
        if parts:
            page_texts.append("\n".join(parts))

    kept.sort(key=lambda f: (f.page, f.key))

    stats = {
        "pages": len(doc),
        "candidates_found": len(candidates),
        "figures_kept": len(kept),
        "figures_dropped": len(candidates) - len(kept),
        "picture_figures": sum(1 for f in kept if f.kind == "image"),
        "page_figures": sum(1 for f in kept if f.kind == "page"),
        "total_kb": round(total / 1024, 1),
        "repeated_images_ignored": len(repeated_images),
        "repeated_shapes_ignored": len(repeated_shapes),
        "shapes_per_page": {p: c for p, c in page_shapes.items() if c > 0},
        **ai_info,
    }
    return ExtractionResult(text="\n\n".join(page_texts), figures=kept, stats=stats)