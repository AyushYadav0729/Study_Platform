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
          type={type}
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
          } ${
            error
              ? "border-danger focus:border-danger"
              : "border-border focus:border-accent"
          }`}
        />
      </div>
      {error && <p className="mt-1.5 text-[13px] text-danger">{error}</p>}
    </div>
  );
}

export default Input;
