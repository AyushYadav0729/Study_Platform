import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, Plus, LogOut, BookOpen } from "lucide-react";
import Logo from "./ui/Logo";
import AddSubjectModal from "./AddSubjectModal";

function Sidebar({ subjects, onAddSubject, user, onLogout }) {
  const [modalOpen, setModalOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <div className="flex h-full flex-col px-5 py-6">
      <div className="px-1">
        <Logo />
      </div>

      <nav className="mt-8">
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
              isActive
                ? "bg-surface text-ink"
                : "text-ink-dim hover:bg-surface hover:text-ink"
            }`
          }
        >
          <LayoutGrid className="h-4 w-4" />
          Dashboard
        </NavLink>
      </nav>

      <div className="mt-8 flex items-center justify-between px-1">
        <span
          className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Subjects
        </span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Add subject"
          className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface hover:text-accent"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex-1 overflow-y-auto">
        {subjects.length === 0 ? (
          <p className="px-3 py-3 text-[13px] leading-snug text-ink-faint">
            No subjects yet. Add one to start uploading notes.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {subjects.map((subject) => (
              <li key={subject.id}>
                <NavLink
                  to={`/subject/${subject.id}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors ${
                      isActive
                        ? "bg-surface text-ink"
                        : "text-ink-dim hover:bg-surface hover:text-ink"
                    }`
                  }
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-teal" />
                  <span className="truncate">{subject.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-soft text-[12px] font-semibold text-teal">
          {initials || "•"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-ink">
            {user?.name || "Loading…"}
          </p>
          <p className="truncate text-[12px] text-ink-faint">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <AddSubjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={onAddSubject}
      />
    </div>
  );
}

export default Sidebar;
