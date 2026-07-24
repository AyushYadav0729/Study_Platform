function Logo({ size = "md", light = false }) {
  const textSize = size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-accent text-[13px] font-bold text-[#1a1305]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        S²
      </span>
      <span
        className={`${textSize} ${light ? "text-ink" : "text-ink"} font-medium`}
        style={{ fontFamily: "var(--font-display)" }}
      >
        Study-Stop
      </span>
    </div>
  );
}

export default Logo;
