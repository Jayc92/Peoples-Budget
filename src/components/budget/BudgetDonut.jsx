import { tierSum } from "../../lib/allocation";

// Restrained donut. Color is supplementary — every segment is also labelled in
// the legend with its name and percentage, so meaning never relies on color.
// Component boundary kept clean so a treemap can replace this later.
export default function BudgetDonut({ tier, allocTier }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const sum = tierSum(allocTier);

  let offset = 0;
  const segments = tier.buckets
    .filter((b) => (allocTier[b.id] || 0) > 0)
    .map((b) => {
      const frac = (allocTier[b.id] || 0) / 100;
      const seg = { id: b.id, label: b.label, color: b.color, pct: allocTier[b.id], dash: frac * C, off: offset };
      offset += frac * C;
      return seg;
    });

  return (
    <figure className="donut">
      <svg viewBox="0 0 120 120" className="donut__svg" role="img" aria-label={`${tier.label} allocation chart, ${sum} percent assigned`}>
        <circle cx="60" cy="60" r={R} className="donut__track" />
        {segments.map((s) => (
          <circle
            key={s.id}
            cx="60" cy="60" r={R}
            className="donut__seg"
            style={{ stroke: s.color }}
            strokeDasharray={`${s.dash} ${C - s.dash}`}
            strokeDashoffset={-s.off}
            transform="rotate(-90 60 60)"
          />
        ))}
        <text x="60" y="56" className="donut__num" textAnchor="middle">{sum}%</text>
        <text x="60" y="72" className="donut__cap" textAnchor="middle">assigned</text>
      </svg>
      {segments.length === 0 ? (
        <figcaption className="donut__empty">Move a slider to start assigning this level.</figcaption>
      ) : (
        <ul className="donut__legend">
          {segments.map((s) => (
            <li key={s.id} className="donut__legend-item">
              <span className="donut__swatch" style={{ background: s.color }} aria-hidden="true" />
              <span className="donut__legend-label">{s.label}</span>
              <span className="donut__legend-pct num">{s.pct}%</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
