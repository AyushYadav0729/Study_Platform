"""
Notes-only figure pipeline (EXPERIMENTAL, used only when FIGURES_ENABLED=true).

For each PDF in a unit: extract text + figures, upload kept figures to Supabase
Storage, and return text containing [[FIGURE <note_id>_p5_1]] markers.
"""
import time
import re
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import SUPABASE_BUCKET
from app.supabase_client import supabase
from app.models import Unit, Note
from app.text_extractor import extract_text
from app.figure_extractor import extract_with_figures, MAX_FIGURES
from app.gemini_client import classify_figures

# same list as in main.py (kept here to avoid a circular import)
SUPPORTED_TEXT_TYPES = {"application/pdf", "text/plain"}


def figures_folder(user_id, unit: Unit, note: Note) -> str:
    return (
        f"users/{user_id}/"
        f"subjects/{unit.subject_id}/"
        f"units/{unit.id}/"
        f"figures/{note.id}"
    )


def clear_figures_folder(folder: str):
    """Deletes every figure stored in one note's figures folder."""
    try:
        items = supabase.storage.from_(SUPABASE_BUCKET).list(folder)
        paths = [f"{folder}/{i['name']}" for i in items if i.get("name")]
        if paths:
            supabase.storage.from_(SUPABASE_BUCKET).remove(paths)
    except Exception as e:
        print(f"[figures] could not clear {folder}: {e}")


def _pdf_text_and_figures(note: Note, unit: Unit, user_id, file_bytes: bytes, per_file: int):
    folder = figures_folder(user_id, unit, note)
    clear_figures_folder(folder)          # regenerate replaces the old set

    try:
        result = extract_with_figures(
            file_bytes,
            key_prefix=f"{note.id}_",
            max_figures=per_file,
            classifier=classify_figures,
        )
    except Exception as e:
        print(f"[figures] extractor failed for {note.file_name}: {e}")
        return extract_text(file_bytes, note.file_type).strip(), 0

    text = result.text
    uploaded = 0
    for fig in result.figures:
        try:
            supabase.storage.from_(SUPABASE_BUCKET).upload(
                f"{folder}/{fig.key}.jpg",
                fig.data,
                {"content-type": "image/jpeg", "upsert": "true"},
            )
            uploaded += 1
        except Exception as e:
            print(f"[figures] upload failed for {fig.key}: {e}")
            text = text.replace(f"[[FIGURE {fig.key}]]", "")   # no marker without an image

    if not text.strip():                  # e.g. scanned PDF: fall back to the normal extractor
        text = extract_text(file_bytes, note.file_type).strip()

    s = result.stats
    print(
        f"[figures] {note.file_name}: {s['candidates_found']} candidates, "
        f"{s['approved_by_ai']} approved by AI, {uploaded} uploaded, "
        f"{s['total_kb']} KB, ai_error='{s['ai_error']}'"
    )
    return text, uploaded


def collect_unit_text_with_figures(unit: Unit, user_id, db: Session):
    """Same return shape as collect_unit_text(): (combined_text, files_used, files_skipped)."""
    started = time.perf_counter()

    notes = db.query(Note).filter(Note.unit_id == unit.id).all()
    if not notes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No materials uploaded for this unit yet"
        )

    # keep the whole unit near MAX_FIGURES by splitting the allowance between PDFs
    pdf_count = sum(1 for n in notes if n.file_type == "application/pdf")
    per_file = max(1, MAX_FIGURES // max(1, pdf_count))

    parts, files_used, files_skipped = [], [], []
    total_figures = 0

    for note in notes:
        if note.file_type not in SUPPORTED_TEXT_TYPES:
            files_skipped.append(note.file_name)
            continue

        try:
            file_bytes = supabase.storage.from_(SUPABASE_BUCKET).download(note.file_path)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Could not download {note.file_name}: {str(e)}"
            )

        if note.file_type == "application/pdf":
            text, n_figs = _pdf_text_and_figures(note, unit, user_id, file_bytes, per_file)
            total_figures += n_figs
        else:
            text = extract_text(file_bytes, note.file_type).strip()

        if not text.strip():
            files_skipped.append(note.file_name)
            continue

        parts.append(f"=== {note.file_name} ===\n{text}")
        files_used.append(note.file_name)

    if not parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text found in this unit's files"
        )

    print(f"[figures] unit '{unit.name}': {total_figures} figures, {time.perf_counter() - started:.1f}s total")
    return "\n\n".join(parts), files_used, files_skipped

FIGURE_MARKER = re.compile(r"\[\[\s*FIGURE\s+([0-9a-fA-F-]{36})_(p\d+_\d+)\s*\]\]")
ANY_FIGURE_MARKER = re.compile(r"\[\[\s*FIGURE[^\]]*\]\]")
SIGNED_URL_SECONDS = 3600


def resolve_figure_markers(markdown: str, unit: Unit, user_id, db: Session) -> str:
    """
    Replaces [[FIGURE <note_id>_p5_1]] with a Markdown image using a fresh signed URL.
    Markers that are invalid, belong to another unit, or have no image are removed.
    """
    if not markdown or "[[" not in markdown:
        return markdown

    matches = FIGURE_MARKER.findall(markdown)

    # Security: only accept note IDs that really belong to THIS unit
    ids = set()
    for nid, _ in matches:
        try:
            ids.add(UUID(nid))
        except ValueError:
            pass

    valid = set()
    if ids:
        rows = db.query(Note.id).filter(Note.unit_id == unit.id, Note.id.in_(ids)).all()
        valid = {str(r[0]) for r in rows}

    base = (
        f"users/{user_id}/"
        f"subjects/{unit.subject_id}/"
        f"units/{unit.id}/"
        f"figures"
    )

    # One signed URL per distinct figure
    urls = {}
    for nid, key in {(n.lower(), k) for n, k in matches}:
        if nid not in valid:
            continue
        path = f"{base}/{nid}/{nid}_{key}.jpg"
        try:
            res = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(path, SIGNED_URL_SECONDS)
            urls[(nid, key)] = res["signedURL"]
        except Exception as e:
            print(f"[figures] could not sign {path}: {e}")

    def swap(m):
        nid, key = m.group(1).lower(), m.group(2)
        url = urls.get((nid, key))
        if not url:
            return ""
        page = key.split("_")[0][1:]
        return f"\n\n![Figure, page {page}]({url})\n\n"

    result = FIGURE_MARKER.sub(swap, markdown)
    return ANY_FIGURE_MARKER.sub("", result)      # remove any malformed leftovers