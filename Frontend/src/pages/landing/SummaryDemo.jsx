import { useEffect, useState } from "react";
import katex from "katex";
import { RefreshCw, Highlighter } from "lucide-react";

// The Summary / Notes tabs of a unit, written out block by block. Hovering a
// line runs a highlighter over it, the way you'd mark a printout.

const TOUCH = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const tex = (s, display = false) => katex.renderToString(s, { throwOnError: false, displayMode: display });

const CONTENT = {
  summary: [
    { t: "h", html: "Probability basics" },
    { t: "li", html: `<b>Sample space</b> ${tex("S")}: the set of all possible outcomes of an experiment.` },
    { t: "li", html: `Axioms: ${tex("P(A)\\ge 0")}, ${tex("P(S)=1")}, and ${tex("P(A\\cup B)=P(A)+P(B)")} for disjoint events.` },
    { t: "h", html: "Conditional probability" },
    { t: "li", html: `${tex("P(A\\mid B)=\\dfrac{P(A\\cap B)}{P(B)}")}, defined when ${tex("P(B)>0")}.` },
    { t: "li", html: `<b>Independent</b> events satisfy ${tex("P(A\\cap B)=P(A)\\,P(B)")}.` },
    { t: "h", html: "Bayes' theorem" },
    { t: "math", html: tex("P(A_i\\mid B)=\\frac{P(B\\mid A_i)\\,P(A_i)}{\\sum_j P(B\\mid A_j)\\,P(A_j)}", true) },
    { t: "li", html: `Turns a likelihood ${tex("P(B\\mid A)")} into a posterior ${tex("P(A\\mid B)")}.` },
  ],
  notes: [
    { t: "h", html: "Conditional probability" },
    {
      t: "p",
      html: `Conditional probability measures how likely ${tex("A")} is once you know ${tex("B")} has happened. Knowing ${tex("B")} shrinks the sample space to ${tex("B")}, which is why you divide by ${tex("P(B)")}.`,
    },
    { t: "math", html: tex("P(A\\mid B)=\\frac{P(A\\cap B)}{P(B)}", true) },
    {
      t: "p",
      html: "Example: when two cards are drawn without replacement, the chance the second is an ace depends on whether the first one was.",
    },
    { t: "h", html: "Bayes' theorem" },
    {
      t: "p",
      html: `Bayes' theorem reverses a conditional probability. If you know how likely the evidence is under each possible cause, it tells you how likely each cause is <i>given</i> the evidence. The prior ${tex("P(A)")} is updated by the likelihood ${tex("P(B\\mid A)")}.`,
    },
    {
      t: "p",
      html: "It matters most when the cause is rare: a positive result from an accurate test can still mean a low chance of disease if the disease itself is uncommon.",
    },
  ],
};

export default function SummaryDemo({ active }) {
  const [tab, setTab] = useState("summary");
  const [run, setRun] = useState(0);
  const [written, setWritten] = useState(0);
  const [marked, setMarked] = useState(() => new Set());
  const [started, setStarted] = useState(false);
  const blocks = CONTENT[tab];

  useEffect(() => {
    if (!active || started) return undefined;
    const id = setTimeout(() => {
      setStarted(true);
      setRun((r) => r + 1);
    }, 250);
    return () => clearTimeout(id);
  }, [active, started]);

  useEffect(() => {
    if (run === 0) return undefined;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setWritten(n);
      if (n >= blocks.length) clearInterval(id);
    }, 230);
    return () => clearInterval(id);
  }, [run, blocks.length]);

  const switchTab = (t) => {
    if (t === tab) return;
    setTab(t);
    setWritten(0);
    setRun((r) => r + 1);
  };

  const regenerate = () => {
    setWritten(0);
    setMarked(new Set());
    setRun((r) => r + 1);
  };

  const mark = (key) =>
    setMarked((m) => {
      if (m.has(key)) return m;
      const next = new Set(m);
      next.add(key);
      return next;
    });

  const rendered = blocks.map((b, i) => {
        const key = `${tab}-${i}`;
        const cls = `sm-${b.t} ${i < written ? "is-written" : ""} ${marked.has(key) ? "is-marked" : ""}`;
        if (b.t === "h") return <h4 key={key} className={cls} dangerouslySetInnerHTML={{ __html: b.html }} />;
        if (b.t === "math") return <div key={key} className={cls} dangerouslySetInnerHTML={{ __html: b.html }} />;
        return (
          <p key={key} className={cls} onPointerEnter={() => mark(key)} data-cursor="mark">
            <span className="sm-ink" dangerouslySetInnerHTML={{ __html: b.html }} />
          </p>
        );
      });

  return (
    <div className="sm">
      <div className="sm-head">
        <div>
          <p className="sm-kicker">Unit 1</p>
          <p className="sm-title">Probability and Random Variables</p>
        </div>
        <button type="button" className="sm-regen" onClick={regenerate} aria-label="Write it again">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="sm-tabs" role="tablist" aria-label="Unit content">
        {[
          ["summary", "Summary"],
          ["notes", "Notes"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={tab === k ? "is-on" : ""}
            onClick={() => switchTab(k)}
          >
            {label}
          </button>
        ))}
        <span className="sm-tab-dim">Flashcards</span>
      </div>
      <div className="sm-body">{rendered}</div>
      <p className="sm-foot">
        <Highlighter className="h-3.5 w-3.5" />
        {marked.size > 0 ? (
          <>
            {marked.size} {marked.size === 1 ? "line" : "lines"} highlighted.{" "}
            <button type="button" onClick={() => setMarked(new Set())}>
              Clear
            </button>
          </>
        ) : (
          TOUCH ? "Tap a line to highlight it." : "Run your cursor over a line to highlight it."
        )}
      </p>
    </div>
  );
}
