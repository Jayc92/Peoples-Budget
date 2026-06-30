import { useId } from "react";
import { dollarsFor, MAX_PER_CATEGORY } from "../../lib/allocation";
import { fmt, realPct } from "../../lib/taxEstimator";

// `--cat` carries the category color (data binding, not decorative styling).
// Category color appears only as a narrow left rule and the slider accent.
export default function AllocationRow({ bucket, value, maxAllowed = MAX_PER_CATEGORY, tierAmount, onChange, onActivate }) {
  const id = useId();
  const Icon = bucket.Icon;
  const dollars = dollarsFor(value, tierAmount);
  const overCap = value > MAX_PER_CATEGORY; // e.g. restored legacy allocation
  return (
    <div
      className={`alloc-row${overCap ? " alloc-row--over" : ""}`}
      style={{ "--cat": bucket.color }}
      onPointerDown={() => onActivate && onActivate(bucket.id)}
    >
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
      <input
        id={id}
        type="range"
        min="0"
        max={maxAllowed}
        step="1"
        value={Math.min(value, maxAllowed)}
        onChange={(e) => onChange(Number(e.target.value))}
        onFocus={() => onActivate && onActivate(bucket.id)}
        className="alloc-row__slider"
        aria-label={`${bucket.label}: ${value} percent, ${fmt(dollars)}`}
      />
      {overCap ? (
        <p className="alloc-row__over" role="status">
          Over the {MAX_PER_CATEGORY}% limit — lower this category to continue.
        </p>
      ) : (
        <p className="alloc-row__gov">
          <span className="alloc-row__gov-label">Current government spending</span>
          <span className="alloc-row__gov-val num">{realPct(bucket.real)}%</span>
        </p>
      )}
    </div>
  );
}
