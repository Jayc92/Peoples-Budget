import { realPct } from "../../lib/taxEstimator";
import { bucketRef } from "../../lib/allocation";

// Per-tier breakdown: your % (bar) next to the reference %. Values are always
// shown as text so meaning never depends on color or bar length alone.
// A missing community reference renders as "—" (Not enough data), never 0%.
export default function ComparisonTable({ tier, allocTier, refMap, refLabel }) {
  return (
    <section className="cmp-table" aria-label={`${tier.label} breakdown`}>
      <h3 className="cmp-table__title">{tier.label}</h3>
      <div className="cmp-table__head" aria-hidden="true">
        <span className="cmp-table__col-cat">Category</span>
        <span className="cmp-table__col-you">You</span>
        <span className="cmp-table__col-ref">{refLabel}</span>
      </div>
      <ul className="cmp-table__rows">
        {tier.buckets.map((b) => {
          const mine = allocTier[b.id] || 0;
          const ref = bucketRef(b, refMap);
          const refText = refMap ? (ref == null ? null : `${ref}%`) : `${realPct(b.real)}%`;
          return (
            <li key={b.id} className="cmp-table__row" style={{ "--cat": b.color }}>
              <span className="cmp-table__cat">{b.label}</span>
              <span className="cmp-table__you">
                <span className="cmp-table__bar"><span className="cmp-table__bar-fill" style={{ width: `${mine}%` }} /></span>
                <span className="cmp-table__val num">{mine}%</span>
              </span>
              {refText == null ? (
                <span className="cmp-table__ref cmp-table__ref--na">
                  <span aria-hidden="true">&mdash;</span>
                  <span className="sr-only">Not enough data</span>
                </span>
              ) : (
                <span className="cmp-table__ref num">{refText}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
