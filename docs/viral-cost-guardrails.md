# The People's Budget — Viral Cost Guardrails

Keep a traffic spike from becoming a surprise bill — **without weakening privacy or
security** (never trade cohort suppression, RLS, or validation for cost).

## Likely cost drivers
- **Supabase database compute** — the main lever; aggregate reads + write bursts (R1/R2).
- **Supabase egress / bandwidth** — API responses at scale.
- **Vercel bandwidth** — static assets (mostly CDN-cached, cheap) + any functions.
- **Storage** — `votes`/`vote_buckets` growth over time (R11).
- **Logging / analytics** — verbose logs or an unsampled error reporter.
- **CAPTCHA** (if Turnstile added) — usually free/cheap, but account for it.
- **Email / push** (future native) — per-message costs.

## Guardrails to configure (owner, before promotion)
- **Budget alerts:** set spend alerts in **Supabase** and **Vercel** at, e.g., 50% / 80%
  / 100% of your monthly ceiling.
- **Usage alerts:** alert on DB compute hours, egress, and Vercel bandwidth trending
  toward plan limits.
- **Daily caps where available:** enable any hard usage cap the plan offers (note:
  Supabase compute is a fixed monthly add-on, not per-request — the cap is *your
  chosen tier*, so pre-decide the max tier you'll pay for during a spike).
- **Emergency feature disablement:** the kill switches in the incident runbook
  (read-only / aggregate-unavailable / events-disabled) also **reduce cost** by shedding
  the most expensive backend calls. Read-only mode stops write load; aggregate-unavailable
  stops the costliest reads.
- **Nonessential telemetry off:** disable or heavily sample any analytics/error reporting
  during a spike.
- **Caching:** ensure Vercel CDN caches static assets (immutable hashed filenames already
  help); add short-TTL caching for `get_active_events`/tally later if they get hot.
- **Retention limits:** logs/error-reporter retention short (e.g. 7–30 days). Vote data
  is the product — keep it, but archive/summarize old rows if storage cost climbs (R2
  summary-table option).

## Cheapest effective spend order (if you must pay to stay up)
1. **Supabase compute upgrade** (nano→micro/small) — directly addresses R1/R2, the most
   likely failure. Highest reliability-per-dollar.
2. **Turnstile / edge rate limiting** — stops bot-driven waste (R4) cheaply.
3. **Vercel Pro** — only if bandwidth/function limits are actually hit.

## Do NOT cost-optimize by
- lowering the cohort threshold (privacy),
- disabling RLS or the SECURITY DEFINER model (security),
- skipping allocation validation (data integrity),
- logging raw payloads to a cheaper sink (privacy).

## Owner checklist
- [ ] Supabase + Vercel budget/usage alerts set.
- [ ] Max compute tier you'll pay for during a spike decided in advance.
- [ ] Kill-switch mechanism (env flag) ready to shed load.
- [ ] Telemetry sampled/short-retention.
- [ ] Turnstile decision made (also a cost control against bots).
