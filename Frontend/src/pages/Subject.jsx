import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Upload, FileText, Trash2 } from "lucide-react";
import Button from "../components/ui/Button";

const UNITS = ["Unit 1", "Unit 2", "Unit 3", "Unit 4", "Unit 5"];

function Subject({ subjects, onRemoveSubject }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const subject = subjects.find((s) => s.id === id);

  const [selectedUnit, setSelectedUnit] = useState(UNITS[0]);
  const [notes, setNotes] = useState([]);
  const [file, setFile] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return;

    setNotes((prev) => [...prev, { unit: selectedUnit, fileName: file.name }]);
    setFile(null);
    e.target.reset();
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

          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete subject
          </Button>
        </div>

        <h1
          className="mt-4 text-[1.8rem] text-ink"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {subject.name}
        </h1>

        {/* ... rest of the upload form / notes list stays exactly the same ... */}

        <form
          onSubmit={handleUpload}
          className="mt-6 flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label className="mb-1.5 block text-[13px] font-medium text-ink-dim">Unit</label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-alt/60 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
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
        <div className="mt-3 space-y-5">
          {UNITS.map((unit) => {
            const unitNotes = notes.filter((n) => n.unit === unit);
            return (
              <div key={unit}>
                <p
                  className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {unit}
                </p>
                {unitNotes.length === 0 ? (
                  <p className="mt-1.5 text-[13px] text-ink-faint">No files uploaded yet.</p>
                ) : (
                  <ul className="mt-1.5 space-y-1.5">
                    {unitNotes.map((n, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-[14px] text-ink-dim"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 text-teal" />
                        {n.fileName}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

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
    </div>
  );
}

export default Subject;