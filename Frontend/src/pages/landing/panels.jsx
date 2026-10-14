import { useEffect, useRef, useState } from "react";
import { Check, FileText, RotateCcw } from "lucide-react";
import { useFrame } from "./engine";
import { SYLLABUS_MODULES as MODULES } from "./content";
import { FAN_CARDS, FILES, UNITS } from "./cards";
import { v2 } from "./store";


// A syllabus that gets read line by line as you scroll into the chapter,
// in step with the unit columns building on the right.
export function SyllabusScan() {
  const lineRefs = useRef([]);
  const countRef = useRef(null);
  const last = useRef(-1);

  useFrame(() => {
    let p = 0;
    if (v2.fa === 0 && v2.fb === 1) p = v2.t;
    else if (v2.fa >= 1) p = 1;
    let done = 0;
    MODULES.forEach((_, k) => {
      const el = lineRefs.current[k];
      if (!el) return;
      const isDone = p > 0.34 + k * 0.11;
      const reading = !isDone && p > 0.22 + k * 0.11;
      el.classList.toggle("is-done", isDone);
      el.classList.toggle("is-reading", reading);
      if (isDone) done++;
    });
    if (done !== last.current && countRef.current) {
      last.current = done;
      countRef.current.textContent = `${done} of ${MODULES.length} units built`;
    }
  }, 24);

  return (
    <div className="v2-scan">
      <div className="v2-scan-head">
        <span>syllabus_mat2001.pdf</span>
        <span ref={countRef}>0 of 5 units built</span>
      </div>
      <ol>
        {MODULES.map((m, k) => (
          <li
            key={m.heading}
            ref={(el) => {
              lineRefs.current[k] = el;
            }}
          >
            <span className="v2-scan-n">{k + 1}</span>
            <span className="v2-scan-t">{m.title}</span>
            <span className="v2-scan-h">{m.hours}</span>
            <Check className="v2-scan-ok h-3.5 w-3.5" aria-hidden="true" />
          </li>
        ))}
      </ol>
    </div>
  );
}

// Upload chips: click one and the note flies into its unit's pile.
export function SortPanel() {
  const [filed, setFiled] = useState({});
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState("Click a file. Study-Stop reads it and files it under the unit it fits best.");
  const timers = useRef([]);
  const chipRefs = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  const file = (k) => {
    if (busy !== null || filed[k]) return;
    const f = FILES[k];
    setBusy(k);
    setMsg(`Reading ${f.name}…`);
    later(420, () => setMsg("Checking it against your five units…"));
    later(760, () => {
      const r = chipRefs.current[k]?.getBoundingClientRect();
      if (r && v2.deck) v2.deck.fileTo(k, r.left + r.width / 2, r.top + r.height / 2);
    });
    later(1500, () => {
      setFiled((m) => ({ ...m, [k]: true }));
      setBusy(null);
      setMsg(`Filed under Unit ${f.unit + 1}, ${UNITS[f.unit].title}.`);
    });
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    v2.deck?.resetFiles();
    setFiled({});
    setBusy(null);
    setMsg("Click a file. Study-Stop reads it and files it under the unit it fits best.");
  };

  const count = Object.keys(filed).length;
  return (
    <div className="v2-sort">
      <div className="v2-sort-files">
        {FILES.map((f, k) => (
          <button
            key={f.name}
            ref={(el) => {
              chipRefs.current[k] = el;
            }}
            type="button"
            className={`v2-file ${filed[k] ? "is-filed" : ""} ${busy === k ? "is-busy" : ""}`}
            onClick={() => file(k)}
            disabled={!!filed[k]}
          >
            {filed[k] ? <Check className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            <span>{f.name}</span>
            {filed[k] && <em>Unit {f.unit + 1}</em>}
          </button>
        ))}
      </div>
      <p className="v2-sort-msg" aria-live="polite">
        {msg}
      </p>
      {count === FILES.length && (
        <button type="button" className="v2-link" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" /> Put them back
        </button>
      )}
    </div>
  );
}

// Progress for the flashcard fan on the right.
export function FlashPanel() {
  const [seen, setSeen] = useState(() => new Set());
  useEffect(() => {
    const on = (e) => {
      const { index, flipped } = e.detail || {};
      if (!flipped || !FAN_CARDS.includes(index)) return;
      setSeen((s) => (s.has(index) ? s : new Set(s).add(index)));
    };
    window.addEventListener("v2:flip", on);
    return () => window.removeEventListener("v2:flip", on);
  }, []);
  const n = seen.size;
  return (
    <div className="v2-flash">
      <ul className="v2-flash-steps">
        <li>
          <b>Hover</b> a card to lift it out of the fan.
        </li>
        <li>
          <b>Click</b> it to see the answer. Click again to flip it back.
        </li>
      </ul>
      <div className="v2-flash-meter" aria-hidden="true">
        <span style={{ transform: `scaleX(${n / FAN_CARDS.length})` }} />
      </div>
      <p className="v2-flash-count" aria-live="polite">
        {n === FAN_CARDS.length ? "All seven answers checked. That's a unit revised." : `${n} of ${FAN_CARDS.length} answers checked`}
      </p>
    </div>
  );
}
