import { useState } from "react";
import { TIERS, TIER_BY_ID } from "../data/budgetBuckets";
import {
  clampSet, allTiersComplete, overCapBuckets,
  MAX_PER_CATEGORY, MIN_FUNDED_PER_TIER,
} from "../lib/allocation";
import PageHeader from "../components/layout/PageHeader";
import TierNavigation from "../components/budget/TierNavigation";
import AllocationSummary from "../components/budget/AllocationSummary";
import AllocationLedger from "../components/budget/AllocationLedger";
import FundedCategoriesSnapshot from "../components/budget/FundedCategoriesSnapshot";
import Button from "../components/ui/Button";

// `alloc` is owned by the orchestrator (so it can be persisted to localStorage).
// This page is controlled. Only the category ledger scrolls on desktop/tablet.
export default function AllocationPage({ alloc, onAllocChange, taxes, onSubmit, onBack }) {
  const [tierId, setTierId] = useState("federal");
  const tier = TIER_BY_ID[tierId];
  const tierAmount = taxes ? taxes[tier.taxKey] : 0;

  const allComplete = allTiersComplete(alloc, TIERS);
  const overTiers = TIERS.filter((t) => overCapBuckets(alloc[t.id]).length > 0);
  const needsRepair = overTiers.length > 0;

  const setBucket = (bucketId, v) =>
    onAllocChange({ ...alloc, [tierId]: clampSet(alloc[tierId], bucketId, v) });

  const ctaLabel = allComplete
    ? "See my results"
    : needsRepair
    ? "Resolve the highlighted categories to continue"
    : "Complete all three levels to continue";

  return (
    <div className="container container--wide alloc">
      <PageHeader
        eyebrow="Step 2 — Your allocation"
        title="Assign every dollar"
        lead="Move each slider to fund what matters to you. Each level — federal, state, and local — must add up to 100%."
      />

      <p className="alloc__rules">
        Fund at least {MIN_FUNDED_PER_TIER} categories in each level. No single category may receive more than {MAX_PER_CATEGORY}%.
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
          <TierNavigation tiers={TIERS} current={tierId} alloc={alloc} onSelect={setTierId} />
        </div>

        <div className="alloc__panes">
          <div className="alloc__ledger-pane">
            <AllocationLedger tier={tier} allocTier={alloc[tierId]} tierAmount={tierAmount} onChange={setBucket} />
          </div>

          <aside className="alloc__rail">
            <AllocationSummary tier={tier} allocTier={alloc[tierId]} tierAmount={tierAmount} />
            <div className="alloc__snapshot-wrap">
              <FundedCategoriesSnapshot tier={tier} allocTier={alloc[tierId]} tierAmount={tierAmount} />
            </div>
            <div className="alloc__actions">
              <Button variant="primary" disabled={!allComplete} onClick={() => onSubmit && onSubmit(alloc)}>
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
