import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-accent text-[#1a1305] hover:bg-accent-strong active:bg-accent shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]",
  secondary:
    "bg-surface border border-border text-ink hover:bg-surface-hover",
  ghost: "bg-transparent text-ink-dim hover:text-ink hover:bg-surface",
  danger: "bg-danger text-[#1a0f0c] hover:brightness-110",
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
  const sizeCls = size === "sm" ? "text-sm px-3.5 py-2" : "text-[15px] px-4 py-2.5";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium tracking-[-0.01em] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed ${sizeCls} ${VARIANTS[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export default Button;
