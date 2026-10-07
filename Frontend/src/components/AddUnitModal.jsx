import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Input from "./ui/Input";
import Button from "./ui/Button";

function AddUnitModal({ open, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    if (submitting) return;
    setName("");
    setError("");
    onClose();
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && !submitting) {
        setName("");
        setError("");
        onClose();
      }
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give your unit a name");
      return;
    }
    setSubmitting(true);
    try {
      await onAdd(trimmed);
      handleClose();
    } catch {
      setError("Couldn't add that unit. Try again.");
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
            Add a unit
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Close"
            className="rounded-md p-1 text-ink-faint hover:bg-surface-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Unit name"
            name="unitName"
            placeholder="e.g. Unit 4 - Trees & Graphs"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            error={error}
            disabled={submitting}
          />
          <div className="mt-1 flex justify-end gap-2.5">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add unit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddUnitModal;