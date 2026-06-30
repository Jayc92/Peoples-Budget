import AllocationRow from "./AllocationRow";
import { tierRemaining, MAX_PER_CATEGORY } from "../../lib/allocation";

export default function AllocationLedger({ tier, allocTier, tierAmount, onChange, onActivate }) {
  const remaining = tierRemaining(allocTier);
  return (
    <div className="alloc-ledger">
      {tier.buckets.map((b) => {
        const value = allocTier[b.id] || 0;
        return (
          <AllocationRow
            key={b.id}
            bucket={b}
            value={value}
            maxAllowed={Math.min(value + remaining, MAX_PER_CATEGORY)}
            tierAmount={tierAmount}
            onChange={(v) => onChange(b.id, v)}
            onActivate={onActivate}
          />
        );
      })}
    </div>
  );
}
