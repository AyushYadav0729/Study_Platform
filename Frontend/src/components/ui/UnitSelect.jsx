import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, Sparkles } from "lucide-react";

function UnitSelect({ units, value, onChange, onAddUnit, placeholder = "No units yet", disabled = false }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedUnit = units.find((u) => u.id === value);
  const isAiSelected = value === AI_RECOMMEND_VALUE;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-lg border border-border bg-bg-alt/60 px-3.5 py-2.5 text-left text-[15px] text-ink outline-none transition-colors focus:border-accent hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={selectedUnit || isAiSelected ? "text-ink" : "text-ink-faint"}>
          {isAiSelected ? "AI recommendation" : selectedUnit ? selectedUnit.name : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-faint transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          {syllabusParsed && units.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChange(AI_RECOMMEND_VALUE);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between border-b border-border px-3.5 py-2.5 text-left text-[14px] font-medium text-accent transition-colors hover:bg-surface-hover"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                AI recommendation
              </span>
              {isAiSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          )}
          
          {units.length > 0 && (
            <ul className="max-h-56 overflow-y-auto py-1">
              {units.map((unit) => (
                <li key={unit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(unit.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[14px] text-ink transition-colors hover:bg-surface-hover"
                  >
                    {unit.name}
                    {unit.id === value && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {units.length === 0 && (
            <div className="px-3.5 py-2.5 text-[14px] text-ink-faint">
              No units yet
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAddUnit();
            }}
            className={`flex w-full items-center gap-1.5 px-3.5 py-2.5 text-left text-[14px] font-medium text-accent transition-colors hover:bg-surface-hover ${
              units.length > 0 ? "border-t border-border" : ""
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Add unit
          </button>
        </div>
      )}
    </div>
  );
}

export default UnitSelect;