import { useState, useMemo } from "react";
import { TIER_BY_ID } from "../../data/budgetBuckets";
import { tierSum } from "../../lib/allocation";
import { fmt } from "../../lib/taxEstimator";
import { SHARE_URL } from "../../config";

const SHORT = { federal: "Federal", state: "State", county: "Local" };

// One leading priority per tier. Percentages from different tier budgets are
// never compared against each other. Tier access is defensive so malformed or
// legacy allocation data cannot throw.
function tierLeaders(alloc, taxes) {
  return ["federal", "state", "county"]
    .map((tierId) => {
      const tier = TIER_BY_ID[tierId];
      const allocTier = (alloc && alloc[tierId]) || {};
      let best = null;
      for (const b of tier.buckets) {
        const pct = allocTier[b.id] || 0;
        if (!best || pct > best.pct) best = { tierId, tierLabel: tier.label, label: b.label, pct };
      }
      const amount = taxes ? taxes[tier.taxKey] : null;
      const dollars = Number.isFinite(amount) && amount > 0 ? Math.round((best.pct / 100) * amount) : null;
      return { ...best, dollars };
    })
    .filter((p) => p && p.pct > 0 && p.label);
}

// `governmentTopDiff` is computed by the parent against GOVERNMENT spending,
// ranked by estimated dollars: { tierId, categoryLabel, pointDiff, dollarMag }.
export default function SharePanel({ name, region, alloc, taxes, annualTotal, governmentTopDiff }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const leaders = useMemo(() => tierLeaders(alloc, taxes), [alloc, taxes]);
  const complete = ["federal", "state", "county"].every((t) => tierSum((alloc && alloc[t]) || {}) === 100);
  const validTotal = Number.isFinite(annualTotal) && annualTotal > 0;
  const ready = complete && leaders.length === 3 && validTotal;

  const owner = name && name.trim() ? `${name.trim()}\u2019s` : "My";

  const fedLead = leaders.find((l) => l.tierId === "federal");
  const stLead = leaders.find((l) => l.tierId === "state");
  const coLead = leaders.find((l) => l.tierId === "county");
  const priorityLine =
    fedLead && stLead && coLead
      ? `My top priorities were ${fedLead.label} federally, ${stLead.label} at the state level, and ${coLead.label} locally.`
      : "";

  const g = governmentTopDiff;
  const gapLine =
    g && Number.isFinite(g.dollarMag) && g.dollarMag > 0
      ? ` My largest change from current government spending was approximately ${fmt(g.dollarMag)} ${g.pointDiff >= 0 ? "more" : "less"} toward ${g.categoryLabel}.`
      : "";

  const caption = ready
    ? `I created my own version of the public budget by deciding where my estimated federal, state, and local taxes should go.\n\n${priorityLine}${gapLine}\n\nBuild your own People's Budget at ${SHARE_URL}`
    : "";

  const copy = async () => {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  if (!ready) {
    return (
      <section className="share" aria-label="Share your budget">
        <p className="pulse-note muted">Finish assigning all three levels to share your budget.</p>
      </section>
    );
  }

  return (
    <section className="share" aria-label="Share your budget">
      <div className="share__card">
        <p className="share__wordmark"><span aria-hidden="true">&sect;</span> The People&rsquo;s Budget</p>
        <p className="share__owner">{owner} top priority in each level</p>
        <ul className="share__priorities">
          {leaders.map((l) => (
            <li key={l.tierId}>
              <span>{SHORT[l.tierId]} &middot; {l.label}</span>
              <span className="num">{l.dollars != null ? `${fmt(l.dollars)} \u00b7 ${l.pct}%` : `${l.pct}%`}</span>
            </li>
          ))}
        </ul>
        <div className="share__stat">
          <span className="label">Annual contribution</span>
          <span className="num">{fmt(annualTotal)}</span>
        </div>
        {g && Number.isFinite(g.dollarMag) && g.dollarMag > 0 && (
          <p className="share__diff">
            Largest change: approximately {fmt(g.dollarMag)} {g.pointDiff >= 0 ? "more" : "less"} toward {SHORT[g.tierId] || g.tierLabel} {g.categoryLabel}
            {" "}(a {Math.abs(g.pointDiff)}-point {g.pointDiff >= 0 ? "increase" : "decrease"}).
          </p>
        )}
        <p className="share__cta">Where would you put it? {SHARE_URL}</p>
      </div>

      <div className="share__actions">
        <button type="button" className="btn btn--secondary" onClick={copy}>
          {copied ? "Caption copied" : "Copy caption"}
        </button>
        <p className="fine">Screenshot the card to share an image, or copy the caption text.</p>
      </div>

      {copyError && (
        <p className="share__copy-error" role="alert">
          Couldn&rsquo;t copy automatically. Select and copy the caption manually below.
        </p>
      )}

      <label className="sr-only" htmlFor="share-caption">Shareable caption</label>
      <textarea
        id="share-caption"
        className="share__caption"
        readOnly
        rows={3}
        value={caption}
        onFocus={(e) => e.target.select()}
      />
    </section>
  );
}
