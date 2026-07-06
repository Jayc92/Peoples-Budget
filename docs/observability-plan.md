# The People's Budget — Observability & Alerting Plan

Privacy-conscious monitoring so problems are detected before users report them.
Thresholds are **starting points** — retune once beta baselines exist.

## Privacy rules (never send to any telemetry/monitoring)
Never transmit: **exact income, display names, raw allocation payloads, client IDs,
admin secrets, or raw database rows.** Monitor **counts, rates, latencies, and status
codes** — never contents. Scrub URLs/bodies in any error reporter.

## What to monitor & where

| Signal | Source | Why |
|---|---|---|
| Uptime (frontend URL) | external uptime check (e.g. UptimeRobot/BetterStack) | catch full outages |
| Uptime (a lightweight RPC) | uptime check hitting `get_active_events` | catch backend-only outages |
| Frontend JS errors | error reporter (e.g. Sentry) with **PII scrubbing** | catch blank-screen/regressions (R7) |
| RPC latency (p50/p95) | Supabase logs/metrics | detect aggregate slowdowns (R2) |
| RPC error rate | Supabase logs | detect failures/abuse (R1/R4) |
| DB connections | Supabase metrics | connection exhaustion (R1) |
| DB CPU / compute | Supabase metrics | saturation (R1) |
| Storage growth | Supabase metrics | cost/retention (R11) |
| Submission volume | `select count(*)…` or logs | spike/brigading (R1/R4) |
| Event-response volume | logs / query | hot event (R3) |
| Rate-limit frequency | count of `rate_limited` errors | abuse signal (R4) |
| Admin login failures | `admin_audit` / logs | lockout/attack (R9) |
| Deployment status | Vercel deploy notifications | failed releases (R6) |
| Cost anomalies | Vercel + Supabase billing alerts | runaway spend (R11) |

## Frontend error reporting (minimal, private)
The app already logs handled failures to `console.error` and now has a top-level error
boundary. If adding a reporter, configure it to:
- capture only error type/stack + route name,
- **deny-list** request bodies and localStorage,
- sample aggressively to control cost.

## Alert thresholds by severity (tune after baseline)
- **SEV-1 (page immediately):** frontend uptime check down > 2 min; backend RPC uptime
  down > 2 min; DB CPU 100% for > 5 min; connections > 90% of max.
- **SEV-2 (alert promptly):** RPC error rate > 5% for 5 min; `submit_vote` p95 > 2s;
  deploy failed; cost > daily budget alert.
- **SEV-3 (review daily):** RPC p95 above baseline ×2; `rate_limited` rate spiking;
  admin login failures clustering; storage growth off-trend.
- **SEV-4 (note):** isolated JS errors, minor latency drift.

## Baseline first
Before setting hard numbers, run ~1 week of beta and record normal ranges for latency,
error rate, connections, and volume. Replace the placeholders above with baseline ×
sensible multipliers.

## Owner setup checklist
- [ ] External uptime check on the public URL + one on `get_active_events`.
- [ ] Supabase metric alerts (CPU, connections, error rate).
- [ ] Vercel deploy + usage/billing alerts; Supabase billing alerts.
- [ ] (Optional) privacy-scrubbed frontend error reporter.
- [ ] A single place (email/Slack) where all alerts land.
