// Accessible progress meter. value/max are percentages by default.
export default function ProgressMeter({ value, max = 100, tone = "civic", label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className="meter"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <span
        className={`meter__fill meter__fill--${tone}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
