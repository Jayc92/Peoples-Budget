import { dollarsFor } from "../../lib/allocation";
import { fmt } from "../../lib/taxEstimator";

// Persistent snapshot of every funded (>0) category in the active tier.
// Plain text + a color rule per row (color is never the sole signal). Header is
// fixed; only the list scrolls, so the card border always stays visible.
function diffLabel(points) {
  if (points === 0) return "No change from government";
  const unit = Math.abs(points) === 1 ? "percentage point" : "percentage points";
  return points > 0
    ? `${points} ${unit} more than government`
    : `${Math.abs(points)} ${unit} less than government`;
}

export default function FundedCategoriesSnapshot({ tier, allocTier, tierAmount }) {
  // funded only, sorted by percentage desc with original order as stable tiebreak.
  // Original index preserved without mutating tier.buckets.
  const funded = tier.buckets
    .map((b, i) => ({ bucket: b, value: allocTier[b.id] || 0, order: i }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value || a.order - b.order);

  return (
    <section className="alloc-snapshot" aria-label={`Your funded ${tier.label} categories`}>
      <p className="eyebrow alloc-snapshot__head">Your allocation</p>

      {funded.length === 0 ? (
        <div className="alloc-snapshot__empty">
          <p className="alloc-snapshot__empty-title">No categories funded yet.</p>
          <p className="alloc-snapshot__empty-sub">Move a slider to build your allocation.</p>
        </div>
      ) : (
        <ul className="alloc-snapshot__list" tabIndex={0}>
          {funded.map(({ bucket, value }) => {
            const points = Math.round(value - bucket.real);
            return (
              <li key={bucket.id} className="alloc-snapshot__item" style={{ "--cat": bucket.color }}>
                <div className="alloc-snapshot__row">
                  <span className="alloc-snapshot__name">{bucket.label}</span>
                  <span className="alloc-snapshot__figs num">
                    {value}% &middot; {fmt(dollarsFor(value, tierAmount))}
                  </span>
                </div>
                <p className="alloc-snapshot__diff">{diffLabel(points)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
