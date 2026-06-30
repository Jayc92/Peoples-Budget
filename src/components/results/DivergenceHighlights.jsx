import { TIER_BY_ID } from "../../data/budgetBuckets";
import { topDivergences } from "../../lib/allocation";

// Plain-language largest differences from the reference. Neutral wording only —
// "more/less than", never loaded or partisan language. No significance claims.
export default function DivergenceHighlights({ alloc, getRefMap, refNoun, title }) {
  const all = [];
  for (const tierId of ["federal", "state", "county"]) {
    const tier = TIER_BY_ID[tierId];
    const refMap = getRefMap ? getRefMap(tierId) : null;
    topDivergences(alloc[tierId], tier.buckets, refMap).forEach((d) => {
      if (d.diff !== 0) all.push({ ...d, tier: tier.label });
    });
  }
  const top = all.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 4);
  if (!top.length) return null;

  return (
    <section className="divergence" aria-label={title}>
      <h3 className="divergence__title">{title}</h3>
      <ul className="divergence__list">
        {top.map((d) => {
          const more = d.diff > 0;
          const pts = Math.abs(d.diff);
          return (
            <li key={d.tier + d.id} className={`divergence__item divergence__item--${more ? "more" : "less"}`}>
              <span className="divergence__pts num">{more ? "+" : "\u2212"}{pts} pts</span>
              <span className="divergence__text">
                You allocated <strong>{pts} percentage point{pts === 1 ? "" : "s"} {more ? "more" : "less"}</strong> to{" "}
                <strong>{d.label}</strong> ({d.tier}) than {refNoun}.
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
