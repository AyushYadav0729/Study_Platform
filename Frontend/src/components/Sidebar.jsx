import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import api from "../services/authService";
import Logo from "./ui/Logo";
import AddSubjectModal from "./AddSubjectModal";
import ConfirmDialog from "./ui/ConfirmDialog";

function Sidebar({
  subjects,
  onAddSubject,
  user,
  onLogout,
  onNavigate,
  profileError,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [selectedSubjectUnits, setSelectedSubjectUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [unitsError, setUnitsError] = useState("");

  const location = useLocation();
  const unitRouteMatch = location.pathname.match(
    /^\/subject\/([^/]+)\/unit\/([^/]+)/
  );
  const selectedSubjectId = unitRouteMatch?.[1] || null;
  const selectedUnitId = unitRouteMatch?.[2] || null;

  useEffect(() => {
    if (!selectedSubjectId) {
      setSelectedSubjectUnits([]);
      setUnitsError("");
      setUnitsLoading(false);
      return;
    }

    let cancelled = false;

    const loadUnits = async () => {
      setUnitsLoading(true);
      setUnitsError("");

      try {
        const response = await api.get(
          `/subjects/${selectedSubjectId}/units`
        );

        if (!cancelled) {
          setSelectedSubjectUnits(response.data || []);
        }
      } catch (error) {
        console.error("Failed to load sidebar units:", error);

        if (!cancelled) {
          setSelectedSubjectUnits([]);
          setUnitsError("Unable to load modules.");
        }
      } finally {
        if (!cancelled) {
          setUnitsLoading(false);
        }
      }
    };

    loadUnits();

    return () => {
      cancelled = true;
    };
  }, [selectedSubjectId]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  const closeAnd = (callback) => {
    callback?.();
    onNavigate?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5 sm:px-5">
      <div className="px-1">
        <Logo />
      </div>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />

        <input
          type="search"
          placeholder="Search anything"
          aria-label="Search anything"
          className="h-9 w-full rounded-lg border border-border bg-surface px-9 pr-12 text-[12px] text-ink outline-none placeholder:text-ink-faint focus:border-accent/60"
        />

        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 text-[9px] font-medium text-ink-faint">
          Ctrl K
        </span>
      </div>

      <div className="mt-7 flex min-h-0 flex-1 flex-col overflow-hidden">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Workspace
        </p>

        <nav className="mt-2 space-y-0.5">
          <NavLink
            to="/dashboard"
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                isActive
                  ? "bg-surface text-ink shadow-[inset_2px_0_0_var(--color-accent)]"
                  : "text-ink-dim hover:bg-surface hover:text-ink"
              }`
            }
          >
            <LayoutGrid className="h-4 w-4" />
            Dashboard
          </NavLink>

          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-ink-faint opacity-60"
          >
            <Sparkles className="h-4 w-4" />

            Study mode

            <span className="ml-auto rounded-full bg-teal-soft px-1.5 py-0.5 text-[9px] font-semibold text-teal">
              AI
            </span>
          </button>

          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-ink-faint opacity-60"
          >
            <BarChart3 className="h-4 w-4" />
            Assessments
          </button>
        </nav>

        <div className="mt-7 flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Subjects
            </span>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              aria-label="Add subject"
              className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
            {subjects.length === 0 ? (
              <p className="px-3 py-3 text-[12px] leading-snug text-ink-faint">
                No subjects yet. Add one to start uploading notes.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {subjects.map((subject) => (
                  <li key={subject.id}>
                    <NavLink
                      to={`/subject/${subject.id}`}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                          isActive
                            ? "bg-surface text-ink shadow-[inset_2px_0_0_var(--color-accent)]"
                            : "text-ink-dim hover:bg-surface hover:text-ink"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                              isActive ? "bg-accent" : "bg-teal"
                            }`}
                          />

                          <BookOpen className="h-3.5 w-3.5 shrink-0" />

                          <span className="min-w-0 flex-1 truncate">
                            {subject.name}
                          </span>

                          <ChevronRight
                            className={`h-3.5 w-3.5 shrink-0 transition-opacity ${
                              isActive
                                ? "rotate-90 opacity-100 text-ink-faint"
                                : "opacity-0 group-hover:opacity-70"
                            }`}
                          />
                        </>
                      )}
                    </NavLink>

                    {selectedSubjectId === String(subject.id) && (
                      <div className="ml-5 border-l border-border pl-3">
                        {unitsLoading ? (
                          <p className="px-2 py-2 text-[10px] text-ink-faint">
                            Loading modules…
                          </p>
                        ) : unitsError ? (
                          <p className="px-2 py-2 text-[10px] text-danger">
                            {unitsError}
                          </p>
                        ) : selectedSubjectUnits.length > 0 ? (
                          <ul className="space-y-0.5 py-1">
                            {selectedSubjectUnits.map((unit) => (
                              <li key={unit.id}>
                                <NavLink
                                  to={`/subject/${subject.id}/unit/${unit.id}`}
                                  onClick={onNavigate}
                                  className={({ isActive }) =>
                                    `flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
                                      isActive
                                        ? "bg-bg-alt text-accent"
                                        : "text-ink-faint hover:bg-surface hover:text-ink-dim"
                                    }`
                                  }
                                >
                                  <span
                                    className={`h-1 w-1 shrink-0 rounded-full ${
                                      selectedUnitId === String(unit.id)
                                        ? "bg-accent"
                                        : "bg-border"
                                    }`}
                                  />
                                  <span className="min-w-0 flex-1 truncate">
                                    {unit.name}
                                  </span>
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="px-2 py-2 text-[10px] text-ink-faint">
                            No modules yet.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {profileError && (
        <p className="mb-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-[11px] leading-snug text-danger">
          {profileError}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2.5 border-t border-border pt-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-soft text-[11px] font-semibold text-teal">
          {initials || "•"}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-ink">
            {user?.name || "Loading…"}
          </p>

          <p className="truncate text-[11px] text-ink-faint">
            {user?.email || ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setLogoutConfirmOpen(true)}
          aria-label="Log out"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <AddSubjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={async (...args) => {
          await onAddSubject(...args);
          setModalOpen(false);
        }}
      />

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Are you sure you want to log out?"
        confirmLabel="Yes"
        cancelLabel="No"
        danger
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          closeAnd(onLogout);
        }}
      />
    </div>
  );
}

export default Sidebar;