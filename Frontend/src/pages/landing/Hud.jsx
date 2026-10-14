import { useRef } from "react";
import { Link } from "react-router-dom";
import { useFrame } from "./engine";
import Logo from "../../components/ui/Logo";
import { authService } from "../../services/authService";
import { SECTIONS, v2, weightOf } from "./store";

export function Header({ onJump }) {
  const authed = authService.isAuthenticated();
  return (
    <header className="v2-header">
      <button type="button" className="v2-logo" onClick={() => onJump(0)} aria-label="Study-Stop, back to top">
        <Logo />
      </button>
      <nav className="v2-nav" aria-label="Page sections">
        <button type="button" onClick={() => onJump(1)}>
          How it works
        </button>
        <button type="button" onClick={() => onJump(4)}>
          Flashcards
        </button>
        <button type="button" onClick={() => onJump("faq")}>
          FAQ
        </button>
      </nav>
      <div className="v2-auth">
        {authed ? (
          <Link to="/dashboard" className="v2-btn v2-btn--sm">
            Open dashboard
          </Link>
        ) : (
          <>
            <Link to="/login" className="v2-login">
              Log in
            </Link>
            <Link to="/register" className="v2-btn v2-btn--sm">
              Create account
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

// Thin bar across the top showing how far down the page you are.
export function ProgressBar() {
  const ref = useRef(null);
  useFrame(() => {
    if (ref.current) ref.current.style.transform = `scaleX(${v2.progress.toFixed(4)})`;
  }, 20);
  return (
    <div className="v2-progress" aria-hidden="true">
      <span ref={ref} />
    </div>
  );
}

// Numbered chapter list on the right edge. Shows where you are and how much
// is left, and jumps on click.
export function SideIndex({ active, onJump }) {
  return (
    <nav className="v2-index" aria-label="Chapters">
      <ol>
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={i === active ? "is-on" : i < active ? "is-done" : ""}
              aria-current={i === active ? "step" : undefined}
              onClick={() => onJump(i)}
            >
              <span className="v2-index-n">{String(i).padStart(2, "0")}</span>
              <span className="v2-index-tick" aria-hidden="true" />
              <span className="v2-index-label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const WORDS = ["Study", "Units", "Sorted", "Summary", "Recall", "Begin"];

// Giant word behind the deck naming the current chapter. It widens as its
// chapter scrolls in and narrows as it leaves.
export function Backword() {
  const refs = useRef([]);
  useFrame(() => {
    WORDS.forEach((_, f) => {
      const el = refs.current[f];
      if (!el) return;
      const w = weightOf(f);
      const o = Math.min(1, Math.max(0, (w - 0.35) / 0.5));
      el.style.opacity = (o * o * (3 - 2 * o)).toFixed(3);
      el.style.fontVariationSettings = `"wdth" ${(62 + 63 * w).toFixed(1)}, "wght" 900`;
      el.style.transform = `translate3d(0, ${((1 - w) * 30).toFixed(1)}px, 0)`;
    });
  }, 21);
  return (
    <div className="v2-backword" aria-hidden="true">
      {WORDS.map((word, f) => (
        <span
          key={word}
          ref={(el) => {
            refs.current[f] = el;
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}
