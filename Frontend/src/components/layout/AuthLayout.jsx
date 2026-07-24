import { Upload, Sparkles, ListChecks } from "lucide-react";
import Logo from "../ui/Logo";

const FEATURES = [
  { icon: Upload, text: "Upload PDFs, slides, or scanned notes" },
  { icon: Sparkles, text: "Get AI summaries and point revision" },
  { icon: ListChecks, text: "Generate quizzes tuned to your topics" },
];

function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg">
      {/* Brand panel */}
      <div className="ruled-paper relative hidden w-[44%] flex-col justify-between overflow-hidden border-r border-border bg-bg-alt px-12 py-10 lg:flex">
        <div
          className="pointer-events-none absolute left-[40px] top-0 h-full w-px"
          style={{ background: "color-mix(in srgb, var(--color-danger) 35%, transparent)" }}
        />
        <div
          className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--color-accent)" }}
        />

        <Logo size="lg" />

        <div className="relative max-w-sm">
          <h1
            className="text-[2.35rem] leading-[1.15] text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Turn messy notes into{" "}
            <span className="mark text-accent">exam-ready</span> revision.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-dim">
            Study-Stop turns your subject notes into organized modules with AI-generated summaries, point revision, and configurable quizzes for exam prep.
          </p>

          <ul className="mt-8 space-y-3.5">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[14px] text-ink-dim">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-teal">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p
          className="relative text-[12px] uppercase tracking-[0.14em] text-ink-faint"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Private by default · your uploads stay yours
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}

export default AuthLayout;
