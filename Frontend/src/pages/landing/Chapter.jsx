import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

// One chapter: copy on the left, an open stage on the right where the deck
// (or a demo panel) sits. Ends with a "Next" button so the way on is obvious.
export default function Chapter({ id, n, formation, kicker, titleA, titleB, text, next, onNext, stage, children }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id={id} ref={ref} className={`v2ch ${inView ? "is-in" : ""}`} data-formation={formation}>
      <div className="v2ch-copy">
        <p className="v2ch-kicker">
          <b>{String(n).padStart(2, "0")}</b>
          <span className="v2ch-of">/ 04</span>
          {kicker}
        </p>
        <h2 className="v2ch-title">
          <span className="v2ch-a">{titleA}</span>
          <span className="v2ch-b">{titleB}</span>
        </h2>
        <p className="v2ch-text">{text}</p>
        {children}
        {next && (
          <button type="button" className="v2-next" onClick={onNext}>
            <span className="v2-next-label">Next</span>
            {next}
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="v2ch-stage">{typeof stage === "function" ? stage(inView) : stage}</div>
    </section>
  );
}
