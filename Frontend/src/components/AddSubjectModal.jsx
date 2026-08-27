import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { X, Upload } from "lucide-react";
import Input from "./ui/Input";
import Button from "./ui/Button";
import { setPendingSyllabus } from "../utils/pendingSyllabusStore";

function AddSubjectModal({ open, onClose, onAdd }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const handleClose = () => {
    setName("");
    setSyllabus("");
    setSyllabusFile(null);
    setFileError("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setName("");
        setSyllabus("");
        setSyllabusFile(null);
        setFileError("");
        setError("");
        onClose();
      }
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setFileError("Only PDF files are supported");
      setSyllabusFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFileError("");
    setSyllabusFile(file);
  };

  const handleRemoveFile = () => {
    setSyllabusFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Give your subject a name");
      return;
    }
    setSubmitting(true);
    try {
      const subject = await onAdd(trimmedName);
      const trimmedSyllabus = syllabus.trim();
      if (syllabusFile || trimmedSyllabus) {
        setPendingSyllabus(subject.id, {
          text: syllabusFile ? undefined : trimmedSyllabus,
          file: syllabusFile || undefined,
        });
      }
      handleClose();
      navigate(`/subject/${subject.id}`);
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
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="syllabusText"
                className="block text-[13px] font-medium text-ink-dim"
              >
                Syllabus <span className="text-ink-faint">(optional)</span>
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[13px] font-medium text-accent hover:opacity-80"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload PDF
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {syllabusFile ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-bg-alt/40 px-3.5 py-2.5 text-[14px] text-ink">
                <span className="truncate">{syllabusFile.name}</span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  aria-label="Remove file"
                  className="ml-2 shrink-0 rounded-md p-1 text-ink-faint hover:bg-surface-hover hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <textarea
                id="syllabusText"
                name="syllabusText"
                rows={4}
                placeholder="Paste your syllabus text directly from course page to help generate better summaries and quizzes"
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                className="w-full resize-none rounded-lg border border-border bg-bg-alt/40 px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-accent"
              />
            )}
            {fileError && (
              <p className="mt-1.5 text-[13px] text-danger">{fileError}</p>
            )}
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