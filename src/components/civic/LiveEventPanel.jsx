import { TIER_BY_ID } from "../../data/budgetBuckets";

const CHOICES = [
  { key: "increase", label: "Increase" },
  { key: "same", label: "Keep the same" },
  { key: "decrease", label: "Decrease" },
];

// A measured civic briefing — not a breaking-news alert. No urgent red, no
// flashing, no partisan framing.
export default function LiveEventPanel({ event, response, onRespond, tally, disabled = false }) {
  if (!event) return null;
  const tier = TIER_BY_ID[event.tier];
  const bucket = tier && tier.buckets.find((b) => b.id === event.bucketId);
  // Defensive tally: absent keys = 0, non-finite coerced to 0, never NaN%.
  const num = (v) => (Number.isFinite(v) ? v : 0);
  const counts = {
    increase: num(tally && tally.increase),
    same: num(tally && tally.same),
    decrease: num(tally && tally.decrease),
  };
  const total = counts.increase + counts.same + counts.decrease;
  const pct = (key) => (total > 0 ? Math.round((counts[key] / total) * 100) : 0);

  return (
    <section className="event" aria-label="Live civic event">
      {event.badge && <p className="event__badge">{event.badge}</p>}
      <h2 className="event__title">{event.title}</h2>
      {event.body && <p className="event__body">{event.body}</p>}
      {bucket && (
        <p className="event__related">
          <span className="label">Related category</span> {bucket.label} ({tier.label})
        </p>
      )}
      {event.prompt && <p className="event__prompt">{event.prompt}</p>}

      <div className="event__choices" role="group" aria-label="Your response">
        {CHOICES.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`event__choice${response === c.key ? " is-chosen" : ""}`}
            aria-pressed={response === c.key}
            disabled={disabled}
            onClick={() => onRespond && onRespond(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {response && (
        <p className="event__recorded" role="status">
          Your response is recorded. You may change it while this event is active.
        </p>
      )}

      {response && total > 0 && (
        <div className="event__tally" aria-live="polite">
          <p className="label">How others responded</p>
          {CHOICES.map((c) => (
            <div key={c.key} className="event__tally-row">
              <span className="event__tally-label">{c.label}</span>
              <span className="event__tally-bar"><span className="event__tally-fill" style={{ width: `${pct(c.key)}%` }} /></span>
              <span className="event__tally-pct num">{pct(c.key)}%</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
