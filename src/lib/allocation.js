// Allocation logic — preserves the original app's behavior exactly.
// alloc tier shape: { [bucketId]: pct }. Each tier must total 100.

// Integrity rules (UI-v2.1 / DATA-v2.1):
export const MAX_PER_CATEGORY = 50;   // no single category above 50%
export const MIN_FUNDED_PCT = 1;      // a category counts as "funded" at >= 1%
export const MIN_FUNDED_PER_TIER = 3; // at least three funded categories per tier

export function tierSum(allocTier) {
  return Object.values(allocTier || {}).reduce((a, b) => a + (b || 0), 0);
}

export function tierRemaining(allocTier) {
  return 100 - tierSum(allocTier);
}

// Set a bucket, capped so the tier never exceeds 100 AND no category exceeds
// MAX_PER_CATEGORY. (max = min(current + remaining, 50))
export function clampSet(allocTier, bucketId, value) {
  const cur = allocTier[bucketId] || 0;
  const roomToHundred = 100 - (tierSum(allocTier) - cur);
  const maxAllowed = Math.min(roomToHundred, MAX_PER_CATEGORY);
  const v = Math.max(0, Math.min(Math.round(value), maxAllowed));
  return { ...allocTier, [bucketId]: v };
}

// Number of categories funded at >= MIN_FUNDED_PCT.
export function fundedCount(allocTier) {
  return Object.values(allocTier || {}).filter((v) => (v || 0) >= MIN_FUNDED_PCT).length;
}

// Category ids exceeding the per-category cap (e.g. restored legacy data).
export function overCapBuckets(allocTier) {
  return Object.entries(allocTier || {})
    .filter(([, v]) => (v || 0) > MAX_PER_CATEGORY)
    .map(([id]) => id);
}

// A tier is submission-complete when it totals exactly 100, funds at least
// three categories, and has no category over the cap.
export function tierComplete(allocTier) {
  return (
    tierSum(allocTier) === 100 &&
    fundedCount(allocTier) >= MIN_FUNDED_PER_TIER &&
    overCapBuckets(allocTier).length === 0
  );
}

export function allTiersComplete(alloc, tiers) {
  return tiers.every((t) => tierComplete(alloc[t.id]));
}

// Distribute 100 as evenly as possible across the tier's buckets.
export function splitEvenly(buckets) {
  const n = buckets.length;
  const base = Math.floor(100 / n);
  const out = {};
  buckets.forEach((b, i) => { out[b.id] = base + (i < 100 - base * n ? 1 : 0); });
  return out;
}

export function dollarsFor(pct, tierAmount) {
  return Math.round(((pct || 0) / 100) * (tierAmount || 0));
}

// Resolve a reference percentage for a bucket.
//  - Government (refMap == null): use the configured `real` percentage.
//  - Community (refMap provided): use ONLY values the aggregate RPC returned.
//    A category absent from the map is unavailable (null), never 0.
export function bucketRef(bucket, refMap) {
  if (!refMap) return bucket.real;
  return Object.prototype.hasOwnProperty.call(refMap, bucket.id) ? refMap[bucket.id] : null;
}

// Largest government gap ranked by ESTIMATED DOLLARS, comparably across tiers:
//   abs(userPct - govPct) / 100 * tierTaxAmount
// Percentage-point gaps from separate tier budgets are never compared directly.
// Returns null if no tier has a valid (> 0) tax amount, so callers can omit the
// single cross-tier claim rather than fall back to raw percentages.
export function governmentDollarGap(alloc, tiers, taxes) {
  if (!taxes) return null;
  let best = null;
  for (const tier of tiers) {
    const amount = taxes[tier.taxKey];
    if (!(Number.isFinite(amount) && amount > 0)) continue;
    for (const b of tier.buckets) {
      const userPct = (alloc && alloc[tier.id] && alloc[tier.id][b.id]) || 0;
      const pointDiff = userPct - b.real;
      const mag = Math.round((Math.abs(pointDiff) / 100) * amount);
      if (!best || mag > best.dollarMag) {
        best = {
          tierId: tier.id,
          tierLabel: tier.label,
          categoryLabel: b.label,
          userPct,
          govPct: b.real,
          pointDiff,
          dollarMag: mag,
        };
      }
    }
  }
  return best && best.dollarMag > 0 ? best : null;
}

// Largest differences from a reference map (government or community averages).
// Categories with no available reference are excluded from the ranking entirely
// (missing data is never treated as 0%).
export function topDivergences(allocTier, buckets, refMap) {
  return buckets
    .map((b) => {
      const mine = allocTier[b.id] || 0;
      const ref = bucketRef(b, refMap);
      const diff = ref == null ? null : mine - ref;
      return { id: b.id, label: b.label, mine, ref, diff };
    })
    .filter((d) => d.diff != null)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}
