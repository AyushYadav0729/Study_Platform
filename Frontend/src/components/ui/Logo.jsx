function Logo({ size = "md" }) {
  const isLarge = size === "lg";
  const textSize = isLarge ? "text-2xl" : "text-lg";
  const markSize = isLarge ? "h-9 w-9 text-sm" : "h-7 w-7 text-[13px]";

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`flex items-center justify-center rounded-[8px] bg-accent font-bold text-[#1a1305] ${markSize}`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        S²
      </span>
      <span
        className={`${textSize} font-medium text-ink`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        Study-Stop
      </span>
    </div>
  );
}

export default Logo;