import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Input from "./ui/Input";
import Button from "./ui/Button";

function AddSubjectModal({ open, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setName("");
    setSyllabus("");
    setError("");
    onClose();
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setName("");
        setSyllabus("");
        setError("");
        onClose();
      }
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give your subject a name");
      return;
    }
    setSubmitting(true);
    try {
      await onAdd(trimmedName, syllabus.trim() || undefined);
      handleClose();
    } catch {
      setError("Couldn't add that subject. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[400px] rounded-xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3
            className="text-[1.2rem] text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Add a subject
          </h3>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink-faint hover:bg-surface-hover hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Subject name"
            name="subjectName"
            placeholder="e.g. Data Structures"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            error={error}
          />

          <div className="mb-4">
            <label
              htmlFor="syllabusText"
              className="mb-1.5 block text-[13px] font-medium text-ink-dim"
            >
              Syllabus <span className="text-ink-faint">(optional)</span>
            </label>
            <textarea
              id="syllabusText"
              name="syllabusText"
              rows={4}
              placeholder="Paste your syllabus text directly from course page to help generate better summaries and quizzes"
              value={syllabus}
              onChange={(e) => setSyllabus(e.target.value)}
              className="w-full resize-none rounded-lg border border-border bg-bg-alt/40 px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-accent"
            />
          </div>

          <div className="mt-1 flex justify-end gap-2.5">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add subject
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddSubjectModal;