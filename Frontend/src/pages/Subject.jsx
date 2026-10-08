import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import api from "../services/authService";
import subjectsService from "../services/subjectsService";
import { takePendingSyllabus } from "../utils/pendingSyllabusStore";

import Button from "../components/ui/Button";
import FeedbackToast from "../components/ui/FeedbackToast";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import AddUnitModal from "../components/AddUnitModal";
import UnitSelect, {
  AI_RECOMMEND_VALUE,
} from "../components/ui/UnitSelect";

function Subject({
  subjects,
  onRemoveSubject,
  onUpdateSubject,
}) {
  const { id } = useParams();
  const navigate = useNavigate();

  const subject = subjects.find((s) => s.id === id);

  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState("");

  const [notes, setNotes] = useState([]);

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackVariant, setFeedbackVariant] = useState("success");

  const [syllabusFile, setSyllabusFile] = useState(null);
  const [syllabusStreaming, setSyllabusStreaming] = useState(false);
  const [syllabusError, setSyllabusError] = useState("");

  const [addUnitOpen, setAddUnitOpen] = useState(false);

  const [freshUnitIds, setFreshUnitIds] = useState(new Set());

  const [previewNote, setPreviewNote] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [unitToDelete, setUnitToDelete] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(false);
  const [unitDeleteError, setUnitDeleteError] = useState("");

  const syllabusCancelledRef = useRef(false);

  /* ============================================================
     File preview
     ============================================================ */

  const handlePreview = async (note) => {
    setPreviewNote(note);
    setPreviewUrl("");
    setPreviewError("");
    setPreviewLoading(true);

    try {
      const response = await api.get(`/notes/${note.id}/preview`);
      setPreviewUrl(response.data.url);
    } catch (error) {
      console.error("Failed to load preview:", error);
      setPreviewError("Couldn't load this file.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = async (note) => {
    try {
      const response = await api.get(`/notes/${note.id}/preview`);

      const link = document.createElement("a");
      link.href = response.data.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    } catch (error) {
      console.error("Failed to download file:", error);
      setFeedbackVariant("error");
      setFeedback("Couldn't download this file.");
    }
  };

  /* ============================================================
     Load units + notes
     ============================================================ */

  useEffect(() => {
    const fetchUnits = async () => {
      setUnitsLoading(true);

      try {
        const response = await api.get(`/subjects/${id}/units`);
        const fetchedUnits = response.data || [];

        setUnits(fetchedUnits);

        if (fetchedUnits.length > 0) {
          setSelectedUnit(
            subject?.syllabus_status === "parsed"
              ? AI_RECOMMEND_VALUE
              : fetchedUnits[0].id
          );
        } else {
          setSelectedUnit("");
        }

        const allNotes = [];

        for (const unit of fetchedUnits) {
          try {
            const notesResponse = await api.get(
              `/units/${unit.id}/notes`
            );

            notesResponse.data.forEach((note) => {
              allNotes.push({
                id: note.id,
                unit: note.unit_id,
                fileName: note.file_name,
                filePath: note.file_path,
                fileType: note.file_type,
              });
            });
          } catch (error) {
            console.error(
              `Failed to load notes for ${unit.name}:`,
              error
            );
          }
        }

        setNotes(allNotes);
      } catch (error) {
        console.error("Failed to load subject units:", error);
      } finally {
        setUnitsLoading(false);
      }
    };

    fetchUnits();
  }, [id]);

  /* ============================================================
     Add streamed unit
     ============================================================ */

  const addStreamedUnit = (event) => {
    if (event.type !== "module") return;

    const unit = {
      id: event.unit_id,
      name: event.module.title,
    };

    setUnits((prev) => [...prev, unit]);

    setSelectedUnit((prev) => prev || unit.id);

    setFreshUnitIds((prev) => {
      const next = new Set(prev);
      next.add(unit.id);
      return next;
    });

    setTimeout(() => {
      setFreshUnitIds((prev) => {
        const next = new Set(prev);
        next.delete(unit.id);
        return next;
      });
    }, 1500);
  };

  /* ============================================================
     Syllabus upload
     ============================================================ */

  const handleSyllabusEvent = (event) => {
    if (event.type === "module") {
      addStreamedUnit(event);
      return;
    }

    if (event.type === "done") {
      setSyllabusStreaming(false);
      setSyllabusFile(null);

      onUpdateSubject?.(id, {
        syllabus_status: "parsed",
      });

      return;
    }

    if (event.type === "error") {
      console.error(
        "SYLLABUS STREAM ERROR:",
        event.message
      );

      setSyllabusStreaming(false);

      setSyllabusError(
        event.message ||
          "Couldn't generate units from that syllabus."
      );

      onUpdateSubject?.(id, {
        syllabus_status: "failed",
      });
    }
  };

  const handleSyllabusUpload = async (e) => {
    e.preventDefault();

    if (!syllabusFile || syllabusStreaming) return;

    setSyllabusStreaming(true);
    setSyllabusError("");

    try {
      await subjectsService.streamSyllabus(
        id,
        { file: syllabusFile },
        handleSyllabusEvent
      );
    } catch (error) {
      console.error("SYLLABUS UPLOAD ERROR:", error);

      setSyllabusStreaming(false);
      setSyllabusError(
        "Couldn't generate units from that syllabus."
      );
    }
  };

  /* ============================================================
     Pending syllabus
     ============================================================ */

  useEffect(() => {
    syllabusCancelledRef.current = false;

    const pending = takePendingSyllabus(id);

    if (!pending) {
      return () => {
        syllabusCancelledRef.current = true;
      };
    }

    setSyllabusStreaming(true);
    setSyllabusError("");

    subjectsService
      .streamSyllabus(id, pending, (event) => {
        if (syllabusCancelledRef.current) return;

        handleSyllabusEvent(event);
      })
      .catch(() => {
        if (syllabusCancelledRef.current) return;

        setSyllabusStreaming(false);
        setSyllabusError(
          "Couldn't generate units from that syllabus."
        );
      });

    return () => {
      syllabusCancelledRef.current = true;
    };
  }, [id]);

  /* ============================================================
     Notes
     ============================================================ */

  const fetchNotesForUnit = async (unitId) => {
    try {
      const response = await api.get(
        `/units/${unitId}/notes`
      );

      const newNotes = response.data.map((note) => ({
        id: note.id,
        unit: note.unit_id,
        fileName: note.file_name,
        filePath: note.file_path,
        fileType: note.file_type,
      }));

      setNotes((prev) => {
        const otherNotes = prev.filter(
          (note) => note.unit !== unitId
        );

        return [...otherNotes, ...newNotes];
      });
    } catch (error) {
      console.error(
        "Failed to refetch notes:",
        error
      );
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file || !selectedUnit || uploading) return;

    setUploading(true);

    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (selectedUnit === AI_RECOMMEND_VALUE) {
        formData.append("subject_id", id);
      }

      const response = await api.post(
        `/units/${selectedUnit}/notes`,
        formData
      );

      const resolvedUnitId = response.data.unit_id;

      await fetchNotesForUnit(resolvedUnitId);

      setFeedbackVariant("success");
      setFeedback("File uploaded successfully.");
      setFile(null);
      e.target.reset();
    } catch (error) {
      console.error("UPLOAD ERROR:", error);
      setFeedbackVariant("error");
      setFeedback("Couldn't upload this file. Try again.");
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 800 - elapsed);

      await new Promise((resolve) =>
        setTimeout(resolve, remaining)
      );

      setUploading(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);

      setNotes((prev) =>
        prev.filter((note) => note.id !== noteId)
      );
    } catch (error) {
      console.error(
        "Failed to delete note:",
        error
      );

      setFeedbackVariant("error");
      setFeedback("Failed to delete file. Please try again.");
    }
  };

  /* ============================================================
     Subject / unit management
     ============================================================ */

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");

    try {
      await onRemoveSubject(subject.id);
      navigate("/dashboard");
    } catch {
      setDeleteError(
        "Couldn't delete this subject. Try again."
      );
      setDeleting(false);
    }
  };

  const handleAddUnit = async (name) => {
    const unit = await subjectsService.createUnit(
      id,
      name
    );

    setUnits((prev) => [...prev, unit]);
    setSelectedUnit(unit.id);
  };

  const handleConfirmRemoveUnit = async () => {
    if (!unitToDelete) return;

    setDeletingUnit(true);
    setUnitDeleteError("");

    try {
      await subjectsService.removeUnit(
        id,
        unitToDelete.id
      );

      const deletedId = unitToDelete.id;

      setUnits((prev) =>
        prev.filter((unit) => unit.id !== deletedId)
      );

      setNotes((prev) =>
        prev.filter((note) => note.unit !== deletedId)
      );

      if (selectedUnit === deletedId) {
        const remainingUnits = units.filter(
          (unit) => unit.id !== deletedId
        );

        setSelectedUnit(
          remainingUnits.length > 0
            ? remainingUnits[0].id
            : ""
        );
      }

      setUnitToDelete(null);
    } catch {
      setUnitDeleteError(
        "Couldn't delete this unit. Try again."
      );
    } finally {
      setDeletingUnit(false);
    }
  };

  /* ============================================================
     Derived dashboard data
     ============================================================ */

  const totalNotes = notes.length;

  const unitsWithNotes = units.filter((unit) =>
    notes.some((note) => note.unit === unit.id)
  ).length;

  const completion =
    units.length > 0
      ? Math.round(
          (unitsWithNotes / units.length) * 100
        )
      : 0;

  const recentNotes = [...notes]
    .reverse()
    .slice(0, 5);

  /* ============================================================
     Missing subject
     ============================================================ */

  if (!subject) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-[15px] text-ink-dim">
          Subject not found.
        </p>

        <Link
          to="/dashboard"
          className="text-[14px] font-medium text-accent hover:text-accent-strong"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  /* ============================================================
     Render
     ============================================================ */

  return (
    <>
      <FeedbackToast
        message={feedback}
        variant={feedbackVariant}
        onDismiss={() => setFeedback("")}
      />

      {/* Upload overlay */}

      {uploading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-8 py-6 shadow-2xl">
            <Loader2 className="h-7 w-7 animate-spin text-accent" />

            <p className="text-[14px] text-ink-dim">
              Uploading your file...
            </p>
          </div>
        </div>
      )}

      {/* ======================================================
          Breadcrumbs
         ====================================================== */}

      <Breadcrumbs
        items={[
          { label: "Dashboard", to: "/dashboard" },
          { label: subject.name },
        ]}
      />

      {/* ======================================================
          Subject header
         ====================================================== */}

      <section className="mt-5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-teal-soft text-teal">
                <BookOpen className="h-5 w-5" />
              </span>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-faint">
                  Course workspace
                </p>

                <h1
                  className="mt-1 text-[2rem] leading-tight text-ink sm:text-[2.35rem]"
                  style={{
                    fontFamily:
                      "var(--font-display)",
                  }}
                >
                  {subject.name}
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-dim">
              Your course, organized. Keep your syllabus,
              modules, notes, and study material in one place.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-transparent px-3 text-[12px] text-ink-faint transition-all hover:border-danger/20 hover:bg-danger-soft hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================
          Course overview hero
         ====================================================== */}

      <section className="ruled-paper relative mt-8 overflow-hidden rounded-2xl border border-border bg-bg-alt shadow-[0_10px_35px_rgba(0,0,0,0.12)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full border border-accent/10" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full border border-accent/10" />
        <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
          <div className="relative p-7 sm:p-8">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              Study workspace
            </div>

            <h2
              className="mt-3 max-w-xl text-[1.6rem] leading-tight text-ink sm:text-[1.8rem]"
              style={{
                fontFamily: "var(--font-display)",
              }}
            >
              Your course, organized.
            </h2>

            <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-ink-dim">
              Upload your syllabus to automatically create
              modules, or add modules manually and start
              attaching study material.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] text-ink-dim">
                {units.length}{" "}
                {units.length === 1
                  ? "module"
                  : "modules"}
              </span>

              <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] text-ink-dim">
                {totalNotes}{" "}
                {totalNotes === 1
                  ? "material"
                  : "materials"}
              </span>

              {subject.syllabus_status === "parsed" && (
                <span className="rounded-full border border-teal/30 bg-teal-soft px-3 py-1.5 text-[11px] font-medium text-teal">
                  Syllabus parsed
                </span>
              )}
            </div>
          </div>

          <div className="flex min-w-[230px] flex-col justify-center border-t border-border bg-surface/50 p-7 lg:border-l lg:border-t-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-faint">
              Coverage
            </p>

            <p
              className="mt-2 text-[2.5rem] leading-none text-ink"
              style={{
                fontFamily: "var(--font-display)",
              }}
            >
              {completion}%
            </p>

            <p className="mt-2 text-[11px] text-ink-faint">
              modules with study material
            </p>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-teal transition-all duration-500"
                style={{
                  width: `${completion}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================
          Syllabus import
         ====================================================== */}

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Course setup
            </p>

            <h2
              className="mt-1 text-[1.25rem] text-ink"
              style={{
                fontFamily: "var(--font-display)",
              }}
            >
              Build your modules
            </h2>
          </div>
        </div>

        {syllabusStreaming && (
          <div className="mb-4 overflow-hidden rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="flex items-center gap-3 text-[13px] text-ink-dim">
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                <span className="syllabus-ring absolute inset-0 rounded-full" />
                <Sparkles className="h-2.5 w-2.5 text-accent" />
              </span>

              <span>
                Reading your syllabus and writing out modules…
              </span>
            </div>

            <div className="syllabus-progress mt-3" />
          </div>
        )}

        {syllabusError && (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger">
            {syllabusError}
          </div>
        )}

        <form
          onSubmit={handleSyllabusUpload}
          className="rounded-xl border border-border bg-surface p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1.5 block text-[12px] font-medium text-ink-dim">
                Syllabus PDF
              </label>

              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) =>
                  setSyllabusFile(
                    e.target.files?.[0] || null
                  )
                }
                disabled={syllabusStreaming}
                className="block w-full text-[12px] text-ink-faint file:mr-3 file:rounded-lg file:border-0 file:bg-bg-alt file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-ink-dim hover:file:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              />

              <p className="mt-2 text-[11px] text-ink-faint">
                Upload a syllabus and Study-Stop will create
                modules as they are generated.
              </p>
            </div>

            <Button
              type="submit"
              disabled={
                !syllabusFile || syllabusStreaming
              }
              loading={syllabusStreaming}
            >
              {!syllabusStreaming && (
                <Sparkles className="h-4 w-4" />
              )}

              {syllabusStreaming
                ? "Parsing..."
                : "Parse syllabus"}
            </Button>
          </div>
        </form>
      </section>

      {/* ======================================================
          Modules
         ====================================================== */}

      <section className="mt-11">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal" />

              <h2
                className="text-[1.3rem] text-ink"
                style={{
                  fontFamily:
                    "var(--font-display)",
                }}
              >
                Modules
              </h2>
            </div>

            <p className="mt-1 text-[12px] text-ink-faint">
              Open a module to study its material and AI-generated
              content.
            </p>
          </div>

          <Button
            variant="secondary"
            type="button"
            onClick={() => setAddUnitOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add module
          </Button>
        </div>

        {unitsLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[190px] animate-pulse rounded-xl border border-border bg-surface"
              />
            ))}
          </div>
        ) : units.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-bg-alt px-6 py-14 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-teal-soft text-teal">
              <Layers className="h-5 w-5" />
            </span>

            <h3
              className="mt-4 text-[1.15rem] text-ink"
              style={{
                fontFamily:
                  "var(--font-display)",
              }}
            >
              No modules yet
            </h3>

            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-faint">
              Parse your syllabus or add your first module
              manually to start organizing this course.
            </p>

            <Button
              type="button"
              className="mt-5"
              onClick={() => setAddUnitOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add module
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {units.map((unit, index) => {
              const unitNotes = notes.filter(
                (note) => note.unit === unit.id
              );

              const isFresh = freshUnitIds.has(unit.id);

              return (
                <article
                  key={unit.id}
                  className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ${
                    isFresh
                      ? "unit-enter border-accent/60 bg-accent/5"
                      : "border-border bg-surface hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface-hover hover:shadow-[0_12px_30px_rgba(0,0,0,0.16)]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-alt text-teal">
                      <span className="font-mono text-[11px]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        Module {index + 1}
                      </p>

                      <h3
                        className="mt-1 line-clamp-2 text-[1.1rem] leading-snug text-ink"
                        style={{
                          fontFamily:
                            "var(--font-display)",
                        }}
                      >
                        {unit.name}
                      </h3>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`Open ${unit.name}`}
                        title="Open module"
                        onClick={() =>
                          navigate(
                            `/subject/${id}/unit/${unit.id}`
                          )
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent transition-all hover:border-accent/60 hover:bg-accent/20 hover:shadow-[0_0_18px_rgba(226,185,79,0.10)]"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        aria-label={`Delete ${unit.name}`}
                        title="Delete module"
                        onClick={() =>
                          setUnitToDelete(unit)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-border pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                        Materials
                      </span>

                      <span className="text-[11px] text-ink-faint">
                        {unitNotes.length}{" "}
                        {unitNotes.length === 1
                          ? "file"
                          : "files"}
                      </span>
                    </div>

                    <div className="mt-2">
                      {unitNotes.length === 0 ? (
                        <p className="py-2 text-[12px] text-ink-faint">
                          No files uploaded yet.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {unitNotes.slice(0, 3).map((note) => (
                            <div
                              key={note.id}
                              onClick={() => {
                                if (
                                  note.fileType ===
                                  "application/pdf"
                                ) {
                                  handlePreview(note);
                                } else {
                                  handleDownload(note);
                                }
                              }}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-ink-dim transition-colors hover:bg-bg-alt hover:text-ink"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-teal" />

                              <span className="min-w-0 flex-1 truncate">
                                {note.fileName}
                              </span>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNote(
                                    note.id
                                  );
                                }}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-danger-soft hover:text-danger"
                                title="Delete file"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}

                          {unitNotes.length > 3 && (
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/subject/${id}/unit/${unit.id}`
                                )
                              }
                              className="px-2 pt-1 text-[11px] font-medium text-accent hover:text-accent-strong"
                            >
                              + {unitNotes.length - 3} more
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ======================================================
          Upload material
         ====================================================== */}

      {units.length > 0 && (
        <section className="mt-11">
          <div className="mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Quick upload
            </p>

            <h2
              className="mt-1 text-[1.25rem] text-ink"
              style={{
                fontFamily: "var(--font-display)",
              }}
            >
              Add study material
            </h2>
          </div>

          <form
            onSubmit={handleUpload}
            className="rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_25px_rgba(0,0,0,0.10)]"
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-dim">
                  Unit
                </label>

                <UnitSelect
                  units={units}
                  value={selectedUnit}
                  onChange={setSelectedUnit}
                  onAddUnit={() =>
                    setAddUnitOpen(true)
                  }
                  disabled={uploading}
                  syllabusParsed={subject?.syllabus_status === "parsed"}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-dim">
                  File
                </label>

                <input
                  type="file"
                  onChange={(e) =>
                    setFile(
                      e.target.files?.[0] || null
                    )
                  }
                  disabled={uploading}
                  className="block w-full text-[12px] text-ink-faint file:mr-3 file:rounded-lg file:border-0 file:bg-bg-alt file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-ink-dim hover:file:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <Button
                type="submit"
                disabled={
                  !file ||
                  !selectedUnit ||
                  uploading
                }
                loading={uploading}
              >
                {!uploading && (
                  <Upload className="h-4 w-4" />
                )}

                {uploading
                  ? "Uploading..."
                  : "Upload"}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* ======================================================
          Recent materials + AI study mode
         ====================================================== */}

      <section className="mt-11 grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Activity
              </p>

              <h2
                className="mt-1 text-[1.2rem] text-ink"
                style={{
                  fontFamily:
                    "var(--font-display)",
                }}
              >
                Recent materials
              </h2>
            </div>

            <span className="text-[11px] text-ink-faint">
              {totalNotes} total
            </span>
          </div>

          {recentNotes.length === 0 ? (
            <div className="mt-5 rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <FileText className="mx-auto h-5 w-5 text-ink-faint" />

              <p className="mt-2 text-[12px] text-ink-faint">
                Your uploaded materials will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {recentNotes.map((note) => {
                const unit = units.find(
                  (item) => item.id === note.unit
                );

                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      if (
                        note.fileType ===
                        "application/pdf"
                      ) {
                        handlePreview(note);
                      } else {
                        handleDownload(note);
                      }
                    }}
                    className="flex cursor-pointer items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-alt text-teal">
                      <FileText className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-ink">
                        {note.fileName}
                      </p>

                      <p className="mt-0.5 truncate text-[10px] text-ink-faint">
                        {unit?.name ||
                          "Unknown module"}
                      </p>
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-accent/5 p-6">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-accent/10" />
          <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full border border-accent/10" />

          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Sparkles className="h-4 w-4" />
          </span>

          <h2
            className="relative mt-5 text-[1.3rem] text-ink"
            style={{
              fontFamily:
                "var(--font-display)",
            }}
          >
            AI study mode
          </h2>

          <p className="relative mt-2 text-[12px] leading-relaxed text-ink-dim">
            Open any module to generate summaries, AI notes,
            and flashcards from your study material.
          </p>

          {units.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/subject/${id}/unit/${units[0].id}`
                )
              }
              className="relative mt-5 inline-flex items-center gap-2 text-[12px] font-semibold text-accent transition-colors hover:text-accent-strong"
            >
              Start studying
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <p className="relative mt-5 text-[11px] text-ink-faint">
              Add a module to get started.
            </p>
          )}
        </div>
      </section>

      {/* ======================================================
          Modals
         ====================================================== */}

      <AddUnitModal
        open={addUnitOpen}
        onClose={() => setAddUnitOpen(false)}
        onAdd={handleAddUnit}
      />

      {/* Delete subject */}

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete "${subject.name}"?`}
        message={
          deleteError
            ? `This will permanently delete this subject and its notes. This can\'t be undone. ${deleteError}`
            : "This will permanently delete this subject and its notes. This can't be undone."
        }
        confirmLabel="Yes, delete"
        cancelLabel="No, cancel"
        danger
        loading={deleting}
        onCancel={() => !deleting && setConfirmOpen(false)}
        onConfirm={handleDelete}
      />

      {/* Preview */}

      {previewNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => {
            setPreviewNote(null);
            setPreviewUrl("");
            setPreviewError("");
          }}
        >
          <div
            className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-teal" />

                <p className="truncate text-[14px] font-medium text-ink">
                  {previewNote.fileName}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPreviewNote(null);
                  setPreviewUrl("");
                  setPreviewError("");
                }}
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-surface-hover hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 bg-bg">
              {previewLoading && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-[13px] text-ink-faint">
                    Loading preview...
                  </p>
                </div>
              )}

              {previewError && (
                <div className="flex h-full items-center justify-center">
                  <p className="text-[13px] text-danger">
                    {previewError}
                  </p>
                </div>
              )}

              {previewUrl &&
                !previewLoading &&
                !previewError && (
                  <iframe
                    src={previewUrl}
                    title={previewNote.fileName}
                    className="h-full w-full border-0"
                  />
                )}
            </div>
          </div>
        </div>
      )}

      {/* Delete unit */}

      <ConfirmDialog
        open={!!unitToDelete}
        title={unitToDelete ? `Delete "${unitToDelete.name}"?` : "Delete unit?"}
        message={
          unitDeleteError
            ? `This will permanently delete this module and its uploaded notes. This can\'t be undone. ${unitDeleteError}`
            : "This will permanently delete this module and its uploaded notes. This can't be undone."
        }
        confirmLabel="Yes, delete"
        cancelLabel="No, cancel"
        danger
        loading={deletingUnit}
        onCancel={() => !deletingUnit && setUnitToDelete(null)}
        onConfirm={handleConfirmRemoveUnit}
      />
    </>
  );
}

export default Subject;