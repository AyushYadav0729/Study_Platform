import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Layers,
} from "lucide-react";

function SubjectCard({ subject }) {
  return (
    <Link
      to={`/subject/${subject.id}`}
      aria-label={`Open subject ${subject.name}`}
      className="dog-ear group relative flex min-h-[178px] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-surface-hover hover:shadow-[0_12px_35px_rgba(0,0,0,0.18)]"
    >
      {/* Top */}
      <div>
        <div className="flex items-start justify-between">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-teal-soft text-teal transition-colors duration-200 group-hover:border-teal/30">
            <Layers className="h-[17px] w-[17px]" />
          </span>

          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Subject
          </span>
        </div>

        <h3
          className="mt-5 max-w-[90%] text-[1.2rem] leading-snug text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {subject.name}
        </h3>
      </div>

      {/* Bottom */}
      <div className="mt-7 flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-dim transition-colors duration-200 group-hover:text-accent">
          Open subject
        </span>

        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-ink-faint transition-all duration-200 group-hover:border-accent/40 group-hover:bg-accent/10 group-hover:text-accent">
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default SubjectCard;