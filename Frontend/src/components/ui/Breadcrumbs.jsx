import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[11px] text-ink-faint">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-ink-faint/60" />}

            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="max-w-[220px] truncate rounded-sm transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={`max-w-[260px] truncate ${isLast ? "text-ink-dim" : ""}`}
              >
                {item.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;