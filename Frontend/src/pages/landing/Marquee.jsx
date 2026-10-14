import { useEffect, useRef } from "react";
import { useFrame } from "./engine";

const BAND_A = [
  ["g", "Syllabus to units"],
  ["s", "notes filed for you"],
  ["g", "Exam summaries"],
  ["s", "study notes"],
  ["g", "Flashcards"],
  ["s", "real LaTeX"],
];
const BAND_B = [
  "Private by default",
  "PDF and text",
  "15 to 25 cards a unit",
  "Pick the unit or let AI",
  "Built from your own notes",
];

// Two crossing bands that drift sideways and speed up while you scroll.
export default function Marquee() {
  const a = useRef(null);
  const b = useRef(null);
  const st = useRef({ ox: 0, oy: 0, wa: 1, wb: 1 });

  useEffect(() => {
    const measure = () => {
      st.current.wa = (a.current?.scrollWidth || 2) / 2;
      st.current.wb = (b.current?.scrollWidth || 2) / 2;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (a.current) ro.observe(a.current);
    return () => ro.disconnect();
  }, []);

  useFrame((s) => {
    const r = st.current;
    const boost = Math.min(900, Math.abs(s.velocity) * 26);
    const speed = (s.reduced ? 0 : 55) + boost;
    r.ox = (r.ox + speed * s.dt) % r.wa;
    r.oy = (r.oy + speed * 0.8 * s.dt) % r.wb;
    if (a.current) a.current.style.transform = `translate3d(${-r.ox}px,0,0)`;
    if (b.current) b.current.style.transform = `translate3d(${r.oy - r.wb}px,0,0)`;
  }, 23);

  const rowA = (k) =>
    BAND_A.map(([kind, text], i) => (
      <span key={`${k}-${i}`} className={`v2-mq-item v2-mq-${kind}`}>
        {text}
        <span className="v2-mq-star" aria-hidden="true">✦</span>
      </span>
    ));
  const rowB = (k) =>
    BAND_B.map((text, i) => (
      <span key={`${k}-${i}`} className="v2-mq-item">
        {text}
        <span className="v2-mq-dot" aria-hidden="true" />
      </span>
    ));

  return (
    <section className="v2-marquee" aria-label="What Study-Stop does">
      <div className="v2-mq v2-mq--a">
        <div ref={a} className="v2-mq-track">
          {rowA("a")}
          {rowA("b")}
        </div>
      </div>
      <div className="v2-mq v2-mq--b" aria-hidden="true">
        <div ref={b} className="v2-mq-track">
          {rowB("a")}
          {rowB("b")}
        </div>
      </div>
    </section>
  );
}
