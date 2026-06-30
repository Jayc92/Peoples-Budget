import { dollarsFor } from "../../lib/allocation";
import { fmt, realPct } from "../../lib/taxEstimator";

// Compact contextual card showing the category the user is currently adjusting.
// Plain text only (no color-only meaning); not an aria-live region, so it won't
// announce on every drag — keyboard users still get it via slider focus + label.
export default function ActiveCategoryCard({ bucket, value = 0, tierAmount = 0 }) {
  if (!bucket) {
    return (
      <div className="active-cat active-cat--empty">
        <p className="eyebrow active-cat__eyebrow">Select a category</p>
        <p className="active-cat__prompt">Move a slider to see allocation details here.</p>
      </div>
    );
  }

  const dollars = dollarsFor(value, tierAmount);
  const gov = bucket.real;                 // numeric government share
  const points = Math.round(value - gov);  // percentage-point difference
  const diffText =
    points === 0
      ? "No change from current spending"
      : points > 0
      ? `${points} percentage point${points === 1 ? "" : "s"} more than government`
      : `${Math.abs(points)} percentage point${Math.abs(points) === 1 ? "" : "s"} less than government`;

  return (
    <div className="active-cat" style={{ "--cat": bucket.color }}>
      <p className="eyebrow active-cat__eyebrow">Currently adjusting</p>
      <h3 className="active-cat__name">{bucket.label}</h3>
      <p className="active-cat__desc">{bucket.description}</p>

      <div className="active-cat__figures">
        <span className="active-cat__pct num">{value}%</span>
        <span className="active-cat__dollars num">{fmt(dollars)} allocated</span>
      </div>

      <p className="active-cat__gov">
        Current government spending: <span className="num">{realPct(gov)}%</span>
      </p>
      <p className={`active-cat__diff${points > 0 ? " is-more" : points < 0 ? " is-less" : ""}`}>
        {diffText}
      </p>
    </div>
  );
}
