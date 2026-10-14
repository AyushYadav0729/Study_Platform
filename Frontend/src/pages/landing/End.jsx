import { Link } from "react-router-dom";
import Logo from "../../components/ui/Logo";
import StretchText from "./StretchText";
import { QUESTIONS } from "./content";
import { authService } from "../../services/authService";

export function Faq() {
  return (
    <section id="v2-faq" className="v2-faq" aria-labelledby="v2-faq-title">
      <div className="v2-faq-head">
        <p className="v2-kicker">Before you upload</p>
        <h2 id="v2-faq-title" className="v2-faq-title">
          <span className="v2ch-a">Questions</span>
          <span className="v2ch-b">people ask first.</span>
        </h2>
      </div>
      <dl className="v2-faq-grid">
        {QUESTIONS.map((q, i) => (
          <div key={q.q} className="v2-faq-item">
            <dt>
              <span>{String(i + 1).padStart(2, "0")}</span>
              {q.q}
            </dt>
            <dd>{q.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function Final() {
  const authed = authService.isAuthenticated();
  return (
    <section id="v2-start" className="v2-final" data-formation="5" data-stretch-zone aria-labelledby="v2-final-title">
      <h2 id="v2-final-title" className="v2-final-title">
        <StretchText text="Start with" className="v2-hero-a" />
        <span className="v2-hero-b">one syllabus.</span>
      </h2>
      <p className="v2-final-sub">
        Make an account, add your first subject and drop in the syllabus. Units, summaries and flashcards follow.
      </p>
      <div className="v2-hero-cta">
        {authed ? (
          <Link to="/dashboard" className="v2-btn" data-cursor="link">
            Open your dashboard
          </Link>
        ) : (
          <>
            <Link to="/register" className="v2-btn" data-cursor="link">
              Create your account
            </Link>
            <Link to="/login" className="v2-btn-ghost">
              I already have one
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="v2-footer">
      <Logo />
      <p>Private by default. Your uploads stay yours.</p>
      <nav aria-label="Account">
        <Link to="/login">Log in</Link>
        <Link to="/register">Create account</Link>
      </nav>
    </footer>
  );
}
