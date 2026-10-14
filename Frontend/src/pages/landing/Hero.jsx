import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useFrame } from "./engine";
import StretchText from "./StretchText";
import { authService } from "../../services/authService";

export default function Hero({ onJump }) {
  const cueRef = useRef(null);
  const [nudge, setNudge] = useState(false);
  const authed = authService.isAuthenticated();

  // If nobody has scrolled after a few seconds, make the scroll cue louder.
  useEffect(() => {
    const id = setTimeout(() => {
      if (window.scrollY < 20) setNudge(true);
    }, 4200);
    return () => clearTimeout(id);
  }, []);

  useFrame((s) => {
    const el = cueRef.current;
    if (el) el.classList.toggle("is-gone", s.scrollY > 60);
  }, 22);

  return (
    <section id="v2-top" className="v2-hero" data-formation="0" data-stretch-zone>
      <div className="v2-hero-glow" aria-hidden="true" />
      <p className="v2-kicker">
        Syllabus <span>→</span> units <span>→</span> summaries <span>→</span> flashcards
      </p>
      <h1 className="v2-hero-title">
        <StretchText text="From syllabus" className="v2-hero-a" />
        <span className="v2-hero-b">to flashcards.</span>
      </h1>
      <p className="v2-hero-sub">
        Upload your syllabus once. Study-Stop files every note into the right unit, then writes the summaries,
        study notes and flashcards you revise from.
      </p>
      <div className="v2-hero-cta">
        {authed ? (
          <Link to="/dashboard" className="v2-btn" data-cursor="link">
            Open your dashboard
          </Link>
        ) : (
          <Link to="/register" className="v2-btn" data-cursor="link">
            Create your account
          </Link>
        )}
        <button type="button" className="v2-btn-ghost" onClick={() => onJump(1)}>
          See how it works
        </button>
      </div>

      <button
        ref={cueRef}
        type="button"
        className={`v2-scrollcue ${nudge ? "is-nudge" : ""}`}
        onClick={() => onJump(1)}
      >
        <span className="v2-mouse" aria-hidden="true">
          <i />
        </span>
        <span className="v2-scrollcue-text">Scroll to sort the deck</span>
        <ChevronDown className="v2-scrollcue-chev h-4 w-4" aria-hidden="true" />
      </button>

      <p className="v2-corner v2-corner--l" aria-hidden="true">
        40 cards <span>/</span> 5 units <span>/</span> 1 syllabus
      </p>
      <p className="v2-corner v2-corner--r" aria-hidden="true">
        Hover a card. Click to flip it.
      </p>
    </section>
  );
}
