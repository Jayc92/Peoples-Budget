import { INCOME_RANGES } from "../../data/taxConstants";

// Controls which reference the result is compared against, and (for the public)
// how it's filtered. The "Among" dropdown lets the user browse Everyone, their
// state, or ANY supported income range. Only the bracket INDEX is ever sent —
// exact income is never exposed. The visible selection always matches the args.
export default function ComparisonControls({ mode, onMode, filter, onFilter, region, regionAvailable, userBracket }) {
  const amongValue =
    filter.type === "region" ? "region"
    : filter.type === "bracket" ? `b:${filter.value}`
    : "all";

  const onAmong = (e) => {
    const v = e.target.value;
    if (v === "all") onFilter({ type: "all", value: null });
    else if (v === "region") onFilter({ type: "region", value: region });
    else onFilter({ type: "bracket", value: Number(v.slice(2)) });
  };

  return (
    <div className="cmp-controls">
      <div className="cmp-controls__group" role="group" aria-label="Compare against">
        <span className="label">Compare against</span>
        <div className="segmented">
          <button type="button" className="segmented__item" aria-pressed={mode === "gov"} onClick={() => onMode("gov")}>
            Government
          </button>
          <button type="button" className="segmented__item" aria-pressed={mode === "community"} onClick={() => onMode("community")}>
            The public
          </button>
        </div>
      </div>

      {mode === "community" && (
        <div className="cmp-controls__group">
          <label className="label" htmlFor="among-select">Among</label>
          <select id="among-select" className="select" value={amongValue} onChange={onAmong}>
            <option value="all">Everyone</option>
            {regionAvailable && <option value="region">My state{region ? ` — ${region}` : ""}</option>}
            <optgroup label="By income range">
              {INCOME_RANGES.map((r, i) => (
                <option key={i} value={`b:${i}`}>
                  {r.label}{i === userBracket ? " — your range" : ""}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      )}
    </div>
  );
}
