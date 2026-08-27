import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import api from "../services/authService";
import subjectsService from "../services/subjectsService";
import { takePendingSyllabus } from "../utils/pendingSyllabusStore";
import { ArrowLeft, Upload, FileText, Trash2, Plus, ChevronDown, X, Layers, Sparkles } from "lucide-react";
import Button from "../components/ui/Button";
import AddUnitModal from "../components/AddUnitModal";
import UnitSelect from "../components/ui/UnitSelect";


function Subject({ subjects, onRemoveSubject, onUpdateSubject }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const subject = subjects.find((s) => s.id === id);

  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [notes, setNotes] = useState([]);
  const [file, setFile] = useState(null);
  const [addUnitOpen, setAddUnitOpen] = useState(false);

  const [syllabusStreaming, setSyllabusStreaming] = useState(false);
  const [syllabusError, setSyllabusError] = useState("");
  const [freshUnitIds, setFreshUnitIds] = useState(new Set());

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [unitToDelete, setUnitToDelete] = useState(null);
  const [deletingUnit, setDeletingUnit] = useState(false);
  const [unitDeleteError, setUnitDeleteError] = useState("");

  useEffect(() => {
  const fetchUnits = async () => {
    try {
      const response = await api.get(`/subjects/${id}/units`);

      console.log("UNITS FROM BACKEND:", response.data);

      setUnits(response.data);

      if (response.data.length > 0) {
        setSelectedUnit(response.data[0].id);
      }

      const allNotes = [];

      for (const unit of response.data) {
        const notesResponse = await api.get(
          `/units/${unit.id}/notes`
        );

        console.log(
          `NOTES FOR ${unit.name}:`,
          notesResponse.data
        );

        notesResponse.data.forEach((note) => {
          allNotes.push({
            unit: note.unit_id,
            fileName: note.file_name,
            filePath: note.file_path,
            fileType: note.file_type,
            id: note.id,
          });
        });
      }

      setNotes(allNotes);

    } catch (error) {
      console.error("FAILED:", error);
    }
  };

  fetchUnits();
}, [id]);

const syllabusCancelledRef = useRef(false);

useEffect(() => {
  // React StrictMode double-invokes this effect in dev: mount, cleanup, mount
  // again. takePendingSyllabus() is destructive (one-shot), so only the first
  // invocation ever finds the payload and starts the real stream; the
  // synthetic cleanup between the two mounts must not be allowed to silence
  // its events. Resetting the ref at the top of every invocation undoes that
  // phantom cancellation, while a real unmount/id-change (no further
  // invocation to reset it) still cancels for good.
  syllabusCancelledRef.current = false;

  const pending = takePendingSyllabus(id);
  if (pending) {
    setSyllabusStreaming(true);
    setSyllabusError("");

    subjectsService
      .streamSyllabus(id, pending, (event) => {
        if (syllabusCancelledRef.current) return;

        if (event.type === "module") {
          const unit = { id: event.unit_id, name: event.module.title };
          setUnits((prev) => [...prev, unit]);
          setSelectedUnit((prev) => prev || unit.id);
          setFreshUnitIds((prev) => new Set(prev).add(unit.id));
          setTimeout(() => {
            setFreshUnitIds((prev) => {
              const next = new Set(prev);
              next.delete(unit.id);
              return next;
            });
          }, 1500);
        } else if (event.type === "done") {
          setSyllabusStreaming(false);
          onUpdateSubject?.(id, { syllabus_status: "parsed" });
        } else if (event.type === "error") {
          setSyllabusStreaming(false);
          setSyllabusError("Couldn't generate units from that syllabus.");
          onUpdateSubject?.(id, { syllabus_status: "failed" });
        }
      })
      .catch(() => {
        if (syllabusCancelledRef.current) return;
        setSyllabusStreaming(false);
        setSyllabusError("Couldn't generate units from that syllabus.");
      });
  }

  return () => {
    syllabusCancelledRef.current = true;
  };
}, [id]);

const fetchNotesForUnit = async (unitId) => {
  try {
    console.log("REFETCHING NOTES FOR:", unitId);

    const response = await api.get(
      `/units/${unitId}/notes`
    );

    console.log("REFETCHED NOTES:", response.data);

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
    console.error("FAILED TO REFETCH NOTES:", error);
  }
};

const handleUpload = async (e) => {
  e.preventDefault();

  if (!file || !selectedUnit) return;

  try {
    const formData = new FormData();
    formData.append("file", file);

    await api.post(
      `/units/${selectedUnit}/notes`,
      formData
    );

    console.log("UPLOAD FINISHED, NOW REFETCHING");

    await fetchNotesForUnit(selectedUnit);

    setFile(null);
    e.target.reset();

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
  }
};

const handleDeleteNote = async (noteId) => {
  try {
    await api.delete(`/notes/${noteId}`);

    setNotes((prev) =>
      prev.filter((note) => note.id !== noteId)
    );
  } catch (error) {
    console.error("Failed to delete note:", error);
    alert("Failed to delete file. Please try again.");
  }
};

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await onRemoveSubject(subject.id);
      navigate("/dashboard");
    } catch {
      setDeleteError("Couldn't delete this subject. Try again.");
      setDeleting(false);
    }
  };

  const handleAddUnit = async (name) => {
    const unit = await subjectsService.createUnit(id, name);
    setUnits((prev) => [...prev, unit]);
    setSelectedUnit(unit.id);
  };

  const handleConfirmRemoveUnit = async () => {
    if (!unitToDelete) return;
    setDeletingUnit(true);
    setUnitDeleteError("");
    try {
      await subjectsService.removeUnit(id, unitToDelete.id);
      setUnits((prev) => prev.filter((u) => u.id !== unitToDelete.id));
      setNotes((prev) => prev.filter((n) => n.unit !== unitToDelete.id));
      if (selectedUnit === unitToDelete.id) {
        setSelectedUnit((prevUnits => prevUnits.find((u) => u.id !== unitToDelete.id)?.id || "")(units));
      }
      setUnitToDelete(null);
    } catch {
      setUnitDeleteError("Couldn't delete this unit. Try again.");
    } finally {
      setDeletingUnit(false);
    }
  };
 
  if (!subject) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-ink">
        <p className="text-[15px] text-ink-dim">Subject not found.</p>
        <Link to="/dashboard" className="text-[14px] font-medium text-accent hover:text-accent-strong">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-faint hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete subject
          </button>
        </div>

        <h1
          className="mt-4 text-[1.8rem] text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {subject.name}
        </h1>

        {syllabusStreaming && (
          <div className="mt-6 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="flex items-center gap-3 text-[13px] text-ink-dim">
              <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                <span className="syllabus-ring absolute inset-0 rounded-full" />
                <Sparkles className="h-2.5 w-2.5 text-accent" />
              </span>
              Reading your syllabus and writing out units…
            </div>
            <div className="syllabus-progress mt-3" />
          </div>
        )}

        {syllabusError && (
          <div className="mt-6 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-[13px] text-danger">
            {syllabusError}
          </div>
        )}

        {/* ... rest of the upload form / notes list stays exactly the same ... */}

        <form
          onSubmit={handleUpload}
          className="relative z-10 mt-6 flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-1.5 block text-[13px] font-medium text-ink-dim">Unit</label>
            <UnitSelect
              units={units}
              value={selectedUnit}
              onChange={setSelectedUnit}
              onAddUnit={() => setAddUnitOpen(true)}
            />
          </div>

          <div className="flex-1">
            <label className="mb-1.5 block text-[13px] font-medium text-ink-dim">File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-[13px] text-ink-faint file:mr-3 file:rounded-lg file:border-0 file:bg-bg-alt file:px-3 file:py-2 file:text-[13px] file:font-medium file:text-ink-dim hover:file:bg-surface-hover"
            />
          </div>

          <Button type="submit">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </form>

        <h3
          className="mt-10 text-[1.05rem] text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Uploaded notes
        </h3>
        <div className="mt-3 flex flex-col gap-3">
          {units.length === 0 ? (
            <p className="text-[13px] text-ink-faint">
              No units yet. Add a unit to start uploading notes.
            </p>
          ) : (
            units.map((unit) => {
              const unitNotes = notes.filter((n) => n.unit === unit.id);
              const isFresh = freshUnitIds.has(unit.id);
              return (
                <div
                  key={unit.id}
                  className={`relative rounded-xl border p-5 transition-colors duration-700 ${
                    isFresh
                      ? "unit-enter border-accent/60 bg-accent/5"
                      : "border-border bg-surface"
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`Remove ${unit.name}`}
                    onClick={() => setUnitToDelete(unit)}
                    className="absolute right-3 top-3 rounded-md p-1.5 text-ink-faint hover:bg-danger/10 hover:text-danger"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex items-center gap-2.5 pr-8">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-soft text-teal">
                      <Layers className="h-4 w-4" />
                    </span>
                    <p
                      className="text-[15px] text-ink"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {unit.name}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-col">
                    {unitNotes.length === 0 ? (
                      <p className="px-2.5 py-2 text-[13px] text-ink-faint">
                        No files uploaded yet.
                      </p>
                    ) : (
                      unitNotes.map((n) => (
                      <div
                          key={n.id}
                          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[14px] text-ink-dim hover:bg-surface-hover"
                        >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-teal" />

                        <span className="flex-1 truncate">    
                          {n.fileName}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-danger/10 hover:text-danger"
                          title="Delete file"
                          >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AddUnitModal
        open={addUnitOpen}
        onClose={() => setAddUnitOpen(false)}
        onAdd={handleAddUnit}
      />

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => !deleting && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-[400px] rounded-xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-[1.2rem] text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Delete "{subject.name}"?
            </h3>
            <p className="mt-2 text-[14px] text-ink-dim">
              This will permanently delete this subject and its notes. This can't be undone.
            </p>

            {deleteError && (
              <p className="mt-2 text-[13px] text-danger">{deleteError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                No, cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                loading={deleting}
              >
                Yes, delete
              </Button>
            </div>
          </div>
        </div>
      )}
      {unitToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => !deletingUnit && setUnitToDelete(null)}
        >
          <div
            className="w-full max-w-[400px] rounded-xl border border-border bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-[1.2rem] text-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Delete "{unitToDelete.name}"?
            </h3>
            <p className="mt-2 text-[14px] text-ink-dim">
              This will permanently delete this unit and its uploaded notes. This can't be undone.
            </p>

            {unitDeleteError && (
              <p className="mt-2 text-[13px] text-danger">{unitDeleteError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUnitToDelete(null)}
                disabled={deletingUnit}
              >
                No, cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmRemoveUnit}
                loading={deletingUnit}
              >
                Yes, delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Subject;