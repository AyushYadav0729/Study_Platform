import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

function Input({
  label,
  type = "text",
  name,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  autoComplete,
  autoFocus,
  icon: Icon,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="mb-4">
      {label && (
        <label
          htmlFor={name}
          className="mb-1.5 block text-[13px] font-medium text-ink-dim"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        )}
        <input
          id={name}
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={!!error}
          className={`w-full rounded-lg border bg-bg-alt/40 px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-faint outline-none transition-colors ${
            Icon ? "pl-9" : ""
          } ${isPassword ? "pr-9" : ""} ${
            error
              ? "border-danger focus:border-danger"
              : "border-border focus:border-accent"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}

export default Input;