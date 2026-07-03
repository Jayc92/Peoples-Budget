import { useId } from "react";
import { dollarsFor, MAX_PER_CATEGORY } from "../../lib/allocation";
import { fmt, realPct } from "../../lib/taxEstimator";

// `--cat` carries the category color (data binding, not decorative styling).
// The slider range is a FIXED 0–50, so a thumb's position never shifts when
// other categories change — moving one slider only moves that slider.
export default function AllocationRow({ bucket, value, tierAmount, onChange }) {
  const id = useId();
  const Icon = bucket.Icon;
  const dollars = dollarsFor(value, tierAmount);
  const overCap = value > MAX_PER_CATEGORY; // e.g. restored legacy allocation
  const shown = Math.min(value, MAX_PER_CATEGORY);
  const gov = bucket.real;
  // Government benchmark position along the 0–50 track (clamped to 0–100%).
  const markerPct = Math.max(0, Math.min(100, (gov / MAX_PER_CATEGORY) * 100));
  return (
    <div className={`alloc-row${overCap ? " alloc-row--over" : ""}`} style={{ "--cat": bucket.color }}>
      <div className="alloc-row__head">
        <Icon className="alloc-row__icon" size={18} aria-hidden="true" />
        <div className="alloc-row__meta">
          <label htmlFor={id} className="alloc-row__name">{bucket.label}</label>
          <p className="alloc-row__desc">{bucket.description}</p>
        </div>
        <div className="alloc-row__figures">
          <span className="alloc-row__dollars num">{fmt(dollars)}</span>
          <span className="alloc-row__pct num">{value}%</span>
        </div>
      </div>
      <div className="alloc-row__slider-wrap">
        <input
          id={id}
          type="range"
          min="0"
          max={MAX_PER_CATEGORY}
          step="1"
          value={shown}
          onChange={(e) => onChange(Number(e.target.value))}
          className="alloc-row__slider"
          aria-label={`${bucket.label}: ${value} percent of your share, ${fmt(dollars)}. Current government allocation ${realPct(gov)} percent.`}
        />
        <span className="alloc-row__gov-marker" style={{ left: `${markerPct}%` }} aria-hidden="true" />
      </div>
      {overCap ? (
        <p className="alloc-row__over" role="status">
          Over the {MAX_PER_CATEGORY}% limit — lower this category to continue.
        </p>
      ) : (
        <p className="alloc-row__gov">
          <span className="alloc-row__gov-label">Current government allocation</span>
          <span className="alloc-row__gov-val num">{realPct(gov)}%</span>
        </p>
      )}
    </div>
  );
}
