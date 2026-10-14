import { useEffect, useRef } from "react";
import { useFrame } from "./engine";

// A highlighter-gold cursor: a dot that tracks exactly and a ring that trails.
// Elements can ask for a label with data-cursor="drag|flip|mark|link"; the 3D
// scene sends hints ("Read", "Spin") through a window event.
const LABELS = { drag: "Drag", flip: "Flip", drop: "Drop" };

export default function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);
  const st = useRef({ x: -100, y: -100, rx: -100, ry: -100, on: false, mode: "", hint: null, down: false });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return undefined;
    const root = document.documentElement;
    root.classList.add("has-cursor");
    const s = st.current;
    const apply = () => {
      const label = s.hint || LABELS[s.mode] || "";
      const ring = ringRef.current;
      if (!ring) return;
      ring.dataset.mode = s.hint ? "hint" : s.mode;
      ring.classList.toggle("has-label", !!label);
      ring.classList.toggle("is-down", s.down);
      if (labelRef.current) labelRef.current.textContent = label;
    };
    const pick = (el) => {
      const tagged = el?.closest("[data-cursor]");
      let mode = tagged ? tagged.dataset.cursor : "";
      if (!mode && el?.closest("a, button, [role='tab']")) mode = "link";
      if (mode !== s.mode) {
        s.mode = mode;
        apply();
      }
    };
    s.repick = () => pick(document.elementFromPoint(s.x, s.y));
    const onMove = (e) => {
      s.x = e.clientX;
      s.y = e.clientY;
      if (!s.on) {
        s.on = true;
        s.rx = s.x;
        s.ry = s.y;
        dotRef.current?.classList.add("is-on");
        ringRef.current?.classList.add("is-on");
      }
      pick(e.target instanceof Element ? e.target : null);
    };
    const onHint = (e) => {
      s.hint = e.detail || null;
      apply();
    };
    const onDown = () => {
      s.down = true;
      apply();
    };
    const onUp = () => {
      s.down = false;
      apply();
    };
    const onLeave = () => {
      s.on = false;
      dotRef.current?.classList.remove("is-on");
      ringRef.current?.classList.remove("is-on");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("cursor:hint", onHint);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("cursor:hint", onHint);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useFrame((frame) => {
    const s = st.current;
    if (!s.on) return;
    // Scrolling moves things under a still pointer; re-check what it's over.
    if (s.lastScroll !== frame.scrollY) {
      s.lastScroll = frame.scrollY;
      s.repick?.();
    }
    const k = 1 - Math.pow(0.0001, frame.dt);
    s.rx += (s.x - s.rx) * Math.min(1, k * 1.15);
    s.ry += (s.y - s.ry) * Math.min(1, k * 1.15);
    if (dotRef.current) dotRef.current.style.transform = `translate3d(${s.x}px, ${s.y}px, 0)`;
    if (ringRef.current) ringRef.current.style.transform = `translate3d(${s.rx}px, ${s.ry}px, 0)`;
  }, 50);

  return (
    <div className="cursor" aria-hidden="true">
      <div ref={ringRef} className="cursor-ring">
        <span ref={labelRef} className="cursor-label" />
      </div>
      <div ref={dotRef} className="cursor-dot" />
    </div>
  );
}
