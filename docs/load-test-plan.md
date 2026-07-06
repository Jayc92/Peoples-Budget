# The People's Budget — Load & Capacity Test Plan

Non-destructive load testing to find real limits **before** a viral moment.

> **Never run these against production.** Use a dedicated **staging** Supabase project
> (separate ref/keys) seeded with synthetic data. Load tests write rows and would
> otherwise pollute real aggregates and burn production quota.

## Request-path & capacity map

For each operation: where it runs, read/write pattern, cost, caching, failure behavior.

| Operation | Served by | R/W | Expensive? | Concurrency-sensitive | Cache opportunity | Failure behavior (today) |
|---|---|---|---|---|---|---|
| Initial app load | **Vercel CDN** (static) | — | no | no (CDN) | already CDN-cached | serves regardless of DB |
| Tax estimate | **Browser only** | — | no | no | n/a | never fails server-side |
| Profile save | **Browser only** (localStorage) | — | no | no | n/a | try/caught; falls back to default |
| Allocation changes | **Browser only** | — | no | no | n/a | local; can't fail server-side |
| Budget submission | **Supabase** `submit_vote` | W | moderate (insert + explode buckets + rate-limit read) | **yes** | no | handled error; local copy kept |
| National aggregate | **Supabase** `get_pulse('all')` | R | **yes** (aggregate + cohort count) | yes | **yes** (summary/edge) | handled; comparison hidden |
| State aggregate | **Supabase** `get_pulse('region')` | R | **yes** (+ unindexed votes.region count) | yes | yes | handled |
| Income-bracket aggregate | **Supabase** `get_pulse('bracket')` | R | **yes** (+ unindexed votes.bracket count) | yes | yes | handled |
| Active-event read | **Supabase** `get_active_events` | R | low (tiny table) | moderate | yes (edge) | handled; event hidden |
| Event response | **Supabase** `record_event_response` | W | low (unique upsert) | yes | no | handled; kept locally |
| Event tally | **Supabase** `get_event_tally` | R | low–moderate | moderate | yes | handled; tally hidden |
| Admin login | **Supabase** `admin_*` (bcrypt) | R | low | low | no | isolated from public |
| Admin event changes | **Supabase** `admin_*` | W | low | low | no | isolated from public |

**Takeaway:** app load + all personal steps are browser/CDN and scale freely. Backend
pressure concentrates on **submission writes** and **aggregate reads** (R1/R2).

## Owner questionnaire (needed for a real capacity estimate)
Please provide before capacity sign-off:
1. Supabase **plan** (Free/Pro/Team) and **compute add-on** (nano/micro/small/…)?
2. Supabase **max connections** and whether the app uses the **pooled** connection.
3. Vercel **plan** (Hobby/Pro) and any **function**/bandwidth limits in effect.
4. Is a **custom domain** live and is Vercel's CDN caching the static assets?
5. Expected **peak concurrent users** and the promotion channel/size.
6. Budget ceiling for a spike (informs cost guardrails).
7. Is a **staging** Supabase project available for load testing? If not, create one.

## Test environment
- Staging Supabase project (own ref/keys), schema migrated 0001–0007.
- Synthetic `client_id`s (random UUIDs) and valid complete allocations.
- A staging deploy of the SPA pointed at staging env vars (or hit RPCs directly).
- **No production credentials in scripts or CI.** Pass keys via env vars locally.

## Staged tests
1. **10 concurrent** — smoke; establish baseline latency.
2. **100 concurrent** — expected small-beta peak.
3. **1,000 concurrent** — viral rehearsal (staging compute sized to intended prod).
4. **Burst** — 0→N in seconds, then drop (press-spike shape).
5. **Sustained reads** — `get_pulse` at steady RPS for 10–15 min (aggregate cost).
6. **Sustained writes** — `submit_vote` with unique client_ids (write + index cost).
7. **Active-event** — mixed `get_active_events` + `record_event_response` + tally.
8. **Mixed web/native** — simulate two client versions calling the same RPCs.

## Thresholds (starting points — retune after baselines)
- **Latency:** p95 < 400ms reads, < 600ms writes at target concurrency.
- **Error rate:** < 1% non-rate-limit errors. (Rate-limit rejections are expected and OK.)
- **DB:** CPU < 80% sustained; connections < 80% of max; no lock waits climbing.
- **Stop conditions:** error rate > 5%, p95 > 2s, CPU pinned at 100%, or connection exhaustion — **stop the test**, record the breaking point.

## Metrics to watch (Supabase dashboard)
CPU%, memory, active/idle connections, slowest queries, disk, and RPC error logs.

## Cleanup / avoid polluting aggregates
- Tag synthetic rows (e.g. a reserved `region='LOADTEST'`) and delete afterward:
  `delete from vote_buckets where region='LOADTEST'; delete from votes where region='LOADTEST';`
- Better: run entirely in **staging** and reset it. Never load-test prod.

## Scripts
Template scripts live in [`tests/load/`](../tests/load/). They read the target URL and
key from environment variables and never contain credentials.
