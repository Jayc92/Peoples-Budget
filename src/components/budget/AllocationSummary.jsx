import ProgressMeter from "../ui/ProgressMeter";
import { fmt } from "../../lib/taxEstimator";
import {
  tierSum, tierRemaining, dollarsFor, fundedCount, overCapBuckets,
  tierComplete, MIN_FUNDED_PER_TIER, MAX_PER_CATEGORY,
} from "../../lib/allocation";

export default function AllocationSummary({ tier, allocTier, tierAmount }) {
  const sum = tierSum(allocTier);
  const remaining = tierRemaining(allocTier);
  const dollarsLeft = dollarsFor(remaining, tierAmount);
  const funded = fundedCount(allocTier);
  const over = overCapBuckets(allocTier).length;
  const complete = tierComplete(allocTier);

  // What still blocks this tier (shown only once the total reaches 100).
  let blocker = null;
  if (sum === 100 && !complete) {
    if (over > 0) blocker = `Lower the category over ${MAX_PER_CATEGORY}%.`;
    else if (funded < MIN_FUNDED_PER_TIER) blocker = `Fund at least ${MIN_FUNDED_PER_TIER} categories (1% or more).`;
  }

  return (
    <div className="alloc-summary" aria-live="polite">
      <div className="alloc-summary__top">
        <span className="label">{tier.label} — allocated</span>
        <span className="alloc-summary__pct num">{sum}%</span>
      </div>
      <ProgressMeter value={sum} tone={complete ? "civic" : "gold"} label={`${tier.label} allocated, ${sum} percent`} />
      <p className="alloc-summary__status">
        {complete ? (
          <span className="alloc-summary__done">This level is complete.</span>
        ) : sum === 100 ? (
          <span className="alloc-summary__warn">{blocker}</span>
        ) : (
          <>
            <span className="num">{fmt(dollarsLeft)}</span> left to assign
            <span className="muted"> · {remaining}% remaining</span>
          </>
        )}
      </p>
      <p className="fine">
        {funded} of {MIN_FUNDED_PER_TIER}+ categories funded · about <span className="num">{fmt(tierAmount)}</span> of {tier.label.toLowerCase()} taxes.
      </p>
    </div>
  );
}
