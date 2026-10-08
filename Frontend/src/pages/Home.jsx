import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";

import AddSubjectModal from "../components/AddSubjectModal";
import SubjectCard from "../components/SubjectCard";
import Alert from "../components/ui/Alert";
import Button from "../components/ui/Button";

function Home({
  subjects,
  subjectsLoading,
  onAddSubject,
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const { user, profileError } = useOutletContext();

  const firstName = user?.name?.split(" ")[0];

  return (
    <>
      {/* --------------------------------------------- */}
      {/* Dashboard header                              */}
      {/* --------------------------------------------- */}

      <section>
        <div className="flex items-end justify-between gap-8">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
              Dashboard
            </p>

            <h1
              className="text-[2.25rem] leading-tight text-ink lg:text-[2.55rem]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {firstName
                ? `Welcome back, ${firstName}`
                : "Welcome back"}
            </h1>

            <p className="mt-2 max-w-xl text-[14px] leading-6 text-ink-dim">
              Pick up where you left off, or create a new subject for
              this semester.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
            New subject
          </Button>
        </div>
      </section>

      {/* --------------------------------------------- */}
      {/* Profile error                                  */}
      {/* --------------------------------------------- */}

      {profileError && (
        <div className="mt-6">
          <Alert variant="error">
            {profileError}
          </Alert>
        </div>
      )}

      {/* --------------------------------------------- */}
      {/* Subject section                                */}
      {/* --------------------------------------------- */}

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2
              className="text-[1.45rem] text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your subjects
            </h2>

            <p className="mt-1 text-[13px] text-ink-dim">
              Your current study spaces.
            </p>
          </div>

          {subjects.length > 0 && (
            <span className="font-mono text-[11px] text-ink-faint">
              {subjects.length}{" "}
              {subjects.length === 1 ? "subject" : "subjects"}
            </span>
          )}
        </div>

        {/* Loading */}
        {subjectsLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-[178px] animate-pulse rounded-2xl border border-border bg-surface"
              />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          /* Empty state */
          <div className="ruled-paper relative overflow-hidden rounded-2xl border border-border bg-bg-alt px-10 py-20 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-teal">
              <Sparkles className="h-5 w-5" />
            </div>

            <h3
              className="mt-5 text-[1.35rem] text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your workspace is empty
            </h3>

            <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-ink-dim">
              Create your first subject to organize your syllabus,
              study materials, summaries, notes, and revision tools.
            </p>

            <Button
              type="button"
              className="mt-6"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create your first subject
            </Button>
          </div>
        ) : (
          /* Subject cards */
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
              />
            ))}
          </div>
        )}
      </section>

      {/* --------------------------------------------- */}
      {/* Small dashboard footer                         */}
      {/* --------------------------------------------- */}

      {subjects.length > 0 && !subjectsLoading && (
        <section className="mt-10 border-t border-border pt-5">
          <div className="flex items-center justify-between text-[12px] text-ink-faint">
            <span>
              Select a subject to continue studying.
            </span>

            <span className="font-mono">
              Study-Stop
            </span>
          </div>
        </section>
      )}

      {/* --------------------------------------------- */}
      {/* Add subject modal                              */}
      {/* --------------------------------------------- */}

      <AddSubjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={onAddSubject}
      />
    </>
  );
}

export default Home;