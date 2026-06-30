import { tierSum } from "../../lib/allocation";

export default function TierNavigation({ tiers, current, alloc, onSelect }) {
  return (
    <nav className="tier-nav" aria-label="Budget tiers">
      {tiers.map((t) => {
        const sum = tierSum(alloc[t.id]);
        const done = sum === 100;
        const active = t.id === current;
        return (
          <button
            key={t.id}
            type="button"
            className={`tier-nav__item${active ? " is-active" : ""}`}
            aria-current={active ? "step" : undefined}
            onClick={() => onSelect(t.id)}
          >
            <span className="tier-nav__label">{t.label}</span>
            <span className={`tier-nav__state${done ? " is-done" : ""}`}>
              {done ? "Complete" : `${sum}%`}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
