import { useState } from "react";
import { TIERS, TIER_BY_ID } from "../data/budgetBuckets";
import {
  clampSet, tierSum, allTiersComplete, overCapBuckets,
  MAX_PER_CATEGORY, MIN_FUNDED_PER_TIER,
} from "../lib/allocation";
import PageHeader from "../components/layout/PageHeader";
import TierNavigation from "../components/budget/TierNavigation";
import AllocationSummary from "../components/budget/AllocationSummary";
import AllocationLedger from "../components/budget/AllocationLedger";
import FundedCategoriesSnapshot from "../components/budget/FundedCategoriesSnapshot";
import TurnstileWidget from "../components/ui/TurnstileWidget";
import Button from "../components/ui/Button";
import { TURNSTILE_ENABLED } from "../config";

// `alloc` is owned by the orchestrator (so it can be persisted to localStorage).
// This page is controlled. Only the category ledger scrolls on desktop/tablet.
export default function AllocationPage({ alloc, onAllocChange, taxes, onSubmit, onBack }) {
  const [tierId, setTierId] = useState("federal");
  // Set when the user tries to increase a category while the tier is already at
  // 100% — we block it (no automatic rebalancing) and explain why.
  const [blocked, setBlocked] = useState(false);
  const tier = TIER_BY_ID[tierId];
  const tierAmount = taxes ? taxes[tier.taxKey] : 0;

  const allComplete = allTiersComplete(alloc, TIERS);
  const overTiers = TIERS.filter((t) => overCapBuckets(alloc[t.id]).length > 0);
  const needsRepair = overTiers.length > 0;

  const setBucket = (bucketId, v) => {
    const allocTier = alloc[tierId];
    const cur = allocTier[bucketId] || 0;
    const req = Math.round(v);
    // At 100%, an increase is blocked (we never silently reduce another category).
    if (tierSum(allocTier) >= 100 && req > cur) {
      setBlocked(true);
      return;
    }
    setBlocked(false);
    onAllocChange({ ...alloc, [tierId]: clampSet(allocTier, bucketId, v) });
  };

  // Switching tiers clears any transient block message.
  const selectTier = (id) => { setTierId(id); setBlocked(false); };

  // Turnstile (only when the gateway is enabled): hold a single-use token; remount
  // the widget after each submit via a changing key so the next attempt gets a fresh one.
  const [tsToken, setTsToken] = useState(null);
  const [tsKey, setTsKey] = useState(0);
  const submittable = allComplete && (!TURNSTILE_ENABLED || !!tsToken);

  const handleSubmit = () => {
    if (!submittable || !onSubmit) return;
    onSubmit(TURNSTILE_ENABLED ? tsToken : undefined);
    if (TURNSTILE_ENABLED) { setTsToken(null); setTsKey((k) => k + 1); } // single-use reset
  };

  const needsVerification = TURNSTILE_ENABLED && allComplete && !tsToken;

  const ctaLabel = !allComplete
    ? needsRepair
      ? "Resolve the highlighted categories to continue"
      : "Complete all three levels to continue"
    : needsVerification
    ? "Complete verification to continue"
    : "See my results";

  return (
    <div className="container container--wide alloc">
      <PageHeader
        eyebrow="Step 2 — Your allocation"
        title="Assign every dollar"
        lead="You're dividing your own estimated tax share across categories. Each level — federal, state, and local — must add up to 100%."
      />

      <p className="alloc__rules">
        Fund at least {MIN_FUNDED_PER_TIER} categories in each level. No single category may receive more than {MAX_PER_CATEGORY}%.
        These sliders split <strong>your estimated share</strong> — 0% means none of <em>your</em> share, not that a program loses all public funding. The mark on each slider shows the current government allocation.
      </p>

      {needsRepair && (
        <p className="alloc__repair" role="alert">
          A saved budget has {overTiers.length === 1 ? "a category" : "categories"} above the {MAX_PER_CATEGORY}% limit
          ({overTiers.map((t) => t.label).join(", ")}). Lower {overTiers.length === 1 ? "it" : "them"} to continue —
          nothing has been changed automatically.
        </p>
      )}

      <div className="alloc__workspace">
        <div className="alloc__tabs">
          <TierNavigation tiers={TIERS} current={tierId} alloc={alloc} onSelect={selectTier} />
        </div>

        <div className="alloc__panes">
          <div className="alloc__ledger-pane">
            <AllocationLedger tier={tier} allocTier={alloc[tierId]} tierAmount={tierAmount} onChange={setBucket} />
          </div>

          <aside className="alloc__rail">
            <AllocationSummary tier={tier} allocTier={alloc[tierId]} tierAmount={tierAmount} blocked={blocked} />
            <div className="alloc__snapshot-wrap">
              <FundedCategoriesSnapshot tier={tier} allocTier={alloc[tierId]} tierAmount={tierAmount} />
            </div>
            <div className="alloc__actions">
              {TURNSTILE_ENABLED && (
                <div className="alloc__turnstile">
                  <TurnstileWidget key={tsKey} onToken={setTsToken} />
                  <p className="turnstile__help">
                    Verification helps keep public results from being flooded by bots.
                  </p>
                </div>
              )}
              <Button variant="primary" disabled={!submittable} onClick={handleSubmit}>
                {ctaLabel}
              </Button>
              {onBack && <Button variant="secondary" onClick={onBack}>Back</Button>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
