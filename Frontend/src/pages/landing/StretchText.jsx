import { useEffect, useRef } from "react";

// Heavy grotesk letters that stretch wider and bolder as the pointer passes
// over them (Archivo's width axis), and stretch in from narrow on first show.
export default function StretchText({ text, as: Tag = "span", className = "", delay = 0, interactive = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !interactive || !window.matchMedia("(pointer: fine)").matches) return undefined;
    const letters = [...el.querySelectorAll(".st-l")];
    let raf = 0;
    let px = -9999;
    let py = -9999;
    const paint = () => {
      raf = 0;
      for (const l of letters) {
        const r = l.getBoundingClientRect();
        const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
        const k = Math.max(0, 1 - d / 260);
        l.style.setProperty("--k", k.toFixed(3));
      }
    };
    const onMove = (e) => {
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      px = py = -9999;
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const zone = el.closest("[data-stretch-zone]") || el;
    zone.addEventListener("pointermove", onMove);
    zone.addEventListener("pointerleave", onLeave);
    return () => {
      zone.removeEventListener("pointermove", onMove);
      zone.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [interactive]);

  let n = 0;
  return (
    <Tag ref={ref} className={`st ${className}`} aria-label={text}>
      {text.split(" ").map((word, wi) => (
        <span key={wi} className="st-w" aria-hidden="true">
          {[...word].map((ch, ci) => (
            <span key={ci} className="st-l" style={{ "--i": n++, "--d": `${delay}ms` }}>
              {ch}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
