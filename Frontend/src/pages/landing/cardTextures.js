// Canvas artwork for the v2 deck. Fronts are colour-coded by card type,
// backs are dark with the answer, so a flipped card reads like the real
// flashcards the app makes.

export const TEX_W = 512;
export const TEX_H = 320;

export const KIND_STYLE = {
  header: { bg: "#e7b74a", ink: "#1a1305", label: "UNIT" },
  term: { bg: "#f2ecdd", ink: "#1c1914", label: "TERM" },
  formula: { bg: "#8fd0bf", ink: "#0f241f", label: "FORMULA" },
  question: { bg: "#b9b2f6", ink: "#1a1738", label: "QUESTION" },
  file: { bg: "#f2a184", ink: "#2a140d", label: "NEW NOTE" },
};

const MONO = (s, w = 500) => `${w} ${s}px "JetBrains Mono", Consolas, monospace`;
const SERIF = (s, italic = false, w = 400) => `${italic ? "italic " : ""}${w} ${s}px Fraunces, Georgia, serif`;
const SANS = (s, w = 400) => `${w} ${s}px "Public Sans", Arial, sans-serif`;
const GROTESK = (s, w = 800) => `${w} ${s}px Archivo, "Arial Black", sans-serif`;

let grain = null;
function grainPattern(ctx) {
  if (!grain) {
    grain = document.createElement("canvas");
    grain.width = grain.height = 96;
    const g = grain.getContext("2d");
    const img = g.createImageData(96, 96);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + Math.random() * 110;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  return ctx.createPattern(grain, "repeat");
}

function wrap(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// Largest size (down to min) at which `text` wraps into at most maxLines.
function fit(ctx, text, fontFn, maxW, maxLines, start, min) {
  let size = start;
  for (; size > min; size -= 2) {
    ctx.font = fontFn(size);
    if (wrap(ctx, text, maxW).length <= maxLines) break;
  }
  ctx.font = fontFn(size);
  return { size, lines: wrap(ctx, text, maxW) };
}

function base(bg) {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = grainPattern(ctx);
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  ctx.restore();
  // soft top sheen
  const g = ctx.createLinearGradient(0, 0, 0, TEX_H);
  g.addColorStop(0, "rgba(255,255,255,0.16)");
  g.addColorStop(0.5, "rgba(255,255,255,0)");
  g.addColorStop(1, "rgba(0,0,0,0.08)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  return { c, ctx };
}

function pill(ctx, text, right, top, ink) {
  ctx.font = MONO(13, 600);
  const w = ctx.measureText(text).width + 22;
  const x = right - w;
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, top, w, 26, 13);
  ctx.stroke();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = ink;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 11, top + 14);
  ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";
}

const P = 30;

export function drawFront(card, index, unitCount = 7) {
  const st = KIND_STYLE[card.kind];
  const { c, ctx } = base(st.bg);
  const ink = st.ink;
  ctx.fillStyle = ink;

  // top row
  ctx.font = MONO(14, 600);
  ctx.globalAlpha = 0.72;
  const unitLabel = card.kind === "file" ? "UPLOAD" : `U${card.unit + 1} · ${card.short.toUpperCase()}`;
  ctx.fillText(unitLabel, P, P + 14);
  ctx.globalAlpha = 1;
  pill(ctx, st.label, TEX_W - P, P - 3, ink);

  const maxW = TEX_W - P * 2;
  if (card.kind === "header") {
    ctx.font = GROTESK(92, 800);
    ctx.fontStretch = "expanded";
    ctx.fillText(`UNIT ${card.unit + 1}`, P - 3, 168);
    ctx.fontStretch = "normal";
    const t = fit(ctx, card.title, (s) => SERIF(s, true, 400), maxW, 2, 34, 22);
    t.lines.forEach((ln, i) => ctx.fillText(ln, P, 214 + i * (t.size * 1.12)));
  } else if (card.kind === "file") {
    ctx.font = GROTESK(30, 700);
    const t = fit(ctx, card.title, (s) => GROTESK(s, 700), maxW, 2, 34, 22);
    t.lines.forEach((ln, i) => ctx.fillText(ln, P, 128 + i * (t.size * 1.15)));
    ctx.font = SERIF(26, true);
    ctx.globalAlpha = 0.8;
    ctx.fillText(`“${card.peek}”`, P, 228);
    ctx.globalAlpha = 1;
  } else if (card.kind === "question") {
    ctx.font = GROTESK(40, 800);
    ctx.globalAlpha = 0.35;
    ctx.fillText("Q.", P, 112);
    ctx.globalAlpha = 1;
    const t = fit(ctx, card.title, (s) => SERIF(s, false, 400), maxW, 3, 40, 24);
    t.lines.forEach((ln, i) => ctx.fillText(ln, P, 160 + i * (t.size * 1.16)));
  } else {
    const hasF = !!card.formula;
    const t = fit(ctx, card.title, (s) => SERIF(s, false, 400), maxW, hasF ? 2 : 3, hasF ? 36 : 44, 22);
    const top = hasF ? 116 : 136;
    t.lines.forEach((ln, i) => ctx.fillText(ln, P, top + i * (t.size * 1.14)));
    if (hasF) {
      const f = fit(ctx, card.formula, (s) => SERIF(s, true, 400), maxW, 1, 34, 18);
      ctx.globalAlpha = 0.92;
      ctx.fillText(f.lines[0], P, 236);
      ctx.globalAlpha = 1;
    }
  }

  // bottom row
  ctx.font = MONO(13, 500);
  ctx.globalAlpha = 0.6;
  if (card.kind === "header") ctx.fillText(`${unitCount} CARDS`, P, TEX_H - P + 4);
  else if (card.kind !== "file") ctx.fillText(`${String(card.row).padStart(2, "0")} / ${String(unitCount).padStart(2, "0")}`, P, TEX_H - P + 4);
  ctx.textAlign = "right";
  ctx.fillText("STUDY-STOP", TEX_W - P, TEX_H - P + 4);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
  void index;
  return c;
}

export function drawBack(card) {
  const st = KIND_STYLE[card.kind];
  const { c, ctx } = base("#1d1a16");
  // coloured edge strip so the card's type still shows when flipped
  ctx.fillStyle = st.bg;
  ctx.fillRect(0, 0, 10, TEX_H);
  ctx.font = MONO(14, 600);
  ctx.fillStyle = "#e7b74a";
  ctx.fillText(card.kind === "header" ? "THIS UNIT" : "ANSWER", P + 4, P + 14);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(242,236,221,0.55)";
  ctx.fillText(card.kind === "file" ? "UPLOAD" : `U${card.unit + 1}`, TEX_W - P, P + 14);
  ctx.textAlign = "left";
  ctx.fillStyle = "#f2ecdd";
  const t = fit(ctx, card.back, (s) => SANS(s, 500), TEX_W - P * 2 - 4, 4, 32, 20);
  const top = 150 - ((t.lines.length - 1) * t.size * 1.3) / 2;
  t.lines.forEach((ln, i) => ctx.fillText(ln, P + 4, top + i * (t.size * 1.3)));
  ctx.font = MONO(12, 500);
  ctx.fillStyle = "rgba(242,236,221,0.45)";
  ctx.fillText("CLICK TO FLIP BACK", P + 4, TEX_H - P + 4);
  return c;
}

export async function loadCardFonts(timeout = 2500) {
  if (!document.fonts) return;
  const loads = Promise.all([
    document.fonts.load('800 40px "Archivo"'),
    document.fonts.load('700 40px "Archivo"'),
    document.fonts.load('400 40px "Fraunces"'),
    document.fonts.load('italic 400 40px "Fraunces"'),
    document.fonts.load('500 20px "Public Sans"'),
    document.fonts.load('600 14px "JetBrains Mono"'),
    document.fonts.load('500 14px "JetBrains Mono"'),
  ]).catch(() => {});
  await Promise.race([loads, new Promise((r) => setTimeout(r, timeout))]);
}
