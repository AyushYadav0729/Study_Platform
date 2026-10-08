import { useEffect } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    classes: "border-teal/30 bg-teal-soft text-teal",
  },
  error: {
    icon: TriangleAlert,
    classes: "border-danger/30 bg-danger-soft text-danger",
  },
  info: {
    icon: Info,
    classes: "border-accent/30 bg-accent/5 text-accent",
  },
};

function FeedbackToast({ message, variant = "success", onDismiss }) {
  useEffect(() => {
    if (!message || !onDismiss) return undefined;

    const timer = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  const config = VARIANTS[variant] ?? VARIANTS.info;
  const Icon = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-[120] flex max-w-[380px] items-start gap-3 rounded-xl border px-4 py-3.5 text-[13px] shadow-2xl backdrop-blur ${config.classes}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 leading-relaxed text-ink">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded-md p-0.5 text-current opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default FeedbackToast;