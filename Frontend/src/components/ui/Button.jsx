import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-accent text-[#1a1305] shadow-[0_1px_0_rgba(255,255,255,0.15)_inset] hover:bg-accent-strong active:bg-accent",
  secondary:
    "border border-border bg-surface text-ink shadow-sm hover:bg-surface-hover",
  ghost:
    "bg-transparent text-ink-dim hover:bg-surface hover:text-ink",
  danger:
    "bg-danger text-[#1a0f0c] shadow-sm hover:brightness-110",
};

function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = "",
  ...rest
}) {
  const sizeCls =
    size === "sm"
      ? "min-h-9 px-3.5 py-2 text-[12px]"
      : "min-h-10 px-4 py-2.5 text-[13px]";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-[-0.01em] transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 ${sizeCls} ${VARIANTS[variant] ?? VARIANTS.primary} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export default Button;