import { Link } from "react-router-dom";
import { ArrowUpRight, Layers } from "lucide-react";

function SubjectCard({ subject }) {
  return (
    <Link
      to={`/subject/${subject.id}`}
      className="dog-ear group flex flex-col justify-between rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40 hover:bg-surface-hover"
    >
      <div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-soft text-teal">
          <Layers className="h-4 w-4" />
        </span>
        <h3
          className="mt-4 text-[1.05rem] leading-snug text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {subject.name}
        </h3>
        <p className="mt-1 text-[13px] text-ink-faint">
          {subject.moduleCount ? `${subject.moduleCount} modules` : "No modules yet"}
        </p>
      </div>

      <div className="mt-6 flex items-center gap-1 text-[13px] font-medium text-ink-dim group-hover:text-accent">
        Open subject
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </Link>
  );
}

export default SubjectCard;
