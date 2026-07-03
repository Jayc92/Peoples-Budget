import AllocationRow from "./AllocationRow";

export default function AllocationLedger({ tier, allocTier, tierAmount, onChange }) {
  return (
    <div className="alloc-ledger">
      {tier.buckets.map((b) => (
        <AllocationRow
          key={b.id}
          bucket={b}
          value={allocTier[b.id] || 0}
          tierAmount={tierAmount}
          onChange={(v) => onChange(b.id, v)}
        />
      ))}
    </div>
  );
}
