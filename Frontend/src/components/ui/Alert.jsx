import { AlertTriangle, CheckCircle2, X } from "lucide-react";

function Alert({ variant = "error", children, onDismiss }) {
  const isError = variant === "error";
  const Icon = isError ? AlertTriangle : CheckCircle2;

  return (
    <div
      role="alert"
      className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3.5 text-[13px] shadow-sm ${
        isError
          ? "border-danger/30 bg-danger-soft text-danger"
          : "border-teal/30 bg-teal-soft text-teal"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 leading-relaxed">{children}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-md p-0.5 text-current opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default Alert;