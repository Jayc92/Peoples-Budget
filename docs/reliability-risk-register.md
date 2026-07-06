# The People's Budget — Reliability Risk Register

Ranked production failure modes for a small→viral audience, grounded in the actual
code and schema (not generic assumptions). This is a living document; tune after
beta baselines exist. **The app is not "viral-proof"** — see Assumptions & Limits.

## Severity scale
- **S1 Critical** — full outage, data loss/exposure, or destructive corruption.
- **S2 High** — core flow (submit / results / admin) materially broken for many users.
- **S3 Medium** — a feature degraded or a user segment affected; workaround exists.
- **S4 Low** — cosmetic or rare, minimal impact.

Likelihood: **L-High / L-Med / L-Low** (over a viral spike window).
Classification: **Beta blocker** / **Pre-viral blocker** / **Later optimization**.

## Architecture reality (what this is built on)
- Frontend is a **static SPA** on Vercel's CDN — the HTML/JS/CSS load path needs **no
  backend** and scales with the CDN.
- All dynamic behavior is **Supabase Postgres** via `SECURITY DEFINER` RPCs. Free tier,
  `t4g.nano`, ~60 max connections (verify current plan).
- Writes: `submit_vote` (1/device/6h), `record_event_response` (unique per device+event).
- Reads: `get_pulse` (aggregate, cohort-suppressed ≥10), `get_active_events`, `get_event_tally`.
- Tax math, allocation, profile, and UI state are **browser-only** (localStorage).

---

## R1 — Submission/read spike exhausts Postgres connections or compute · **S1 · L-Med · Pre-viral blocker**
- **Scenario:** a viral moment drives thousands of concurrent submits + results reads; the nano instance saturates connections/CPU.
- **Triggers:** press/social spike; a breaking event; brigading.
- **User impact:** slow or failing submissions and results; possible full stall.
- **Business/reputation:** first-impression failure at the worst moment.
- **Detection:** Supabase DB CPU %, active connections, RPC latency/error rate (see observability-plan).
- **Current controls:** PgBouncer pooling (Supabase default); static frontend absorbs load spikes; per-device write rate limit reduces write volume.
- **Gaps:** nano compute ceiling; no connection cap on RPC bursts; no submission circuit breaker.
- **Prevention:** upgrade Supabase compute before promotion; ensure the pooled ("Transaction") connection string is used; add a submission circuit breaker (see incident runbook §kill switches).
- **Containment:** enable read-only/submission-paused flag; scale compute up (paid).
- **Recovery:** compute upgrade takes effect quickly; connections drain as clients back off.
- **Rollback:** n/a (capacity, not a release).
- **Data-loss potential:** low (rejected writes aren't lost server-side; users keep local copy).
- **Time to restore:** minutes (plan upgrade) once detected.
- **Owner action:** confirm plan; pre-authorize a compute bump; set alerts.

## R2 — Aggregate RPCs slow as data grows (full scans) · **S2 · L-Med · Later optimization (watch)**
- **Scenario:** `get_pulse` aggregates `vote_buckets` and counts `votes` per filter every request; at scale these get expensive.
- **Detail (verified):** `vote_buckets` is indexed on `bracket`, `region`, `(tier,bucket)`. But `get_pulse`'s **cohort count** runs `count(*) from votes where bracket=?` / `region=?`, and **`votes` has no index on `bracket` or `region`** (only `id` and `(client_id,created_at)`), so that count can seq-scan `votes`.
- **User impact:** slow results screen; compounds R1 under load.
- **Detection:** rising `get_pulse` latency vs. row counts.
- **Current controls:** vote_buckets indexes; no per-request caching.
- **Gaps:** missing `votes(bracket)` / `votes(region)` indexes; every read re-aggregates (no cache).
- **Prevention (schema/query change — NOT auto-applied):** add `create index on public.votes(bracket);` and `create index on public.votes(region);` **when** results latency exceeds ~300ms or `votes` exceeds ~50k rows. Later: a refreshed summary table (see below).
- **Containment:** enable aggregate-unavailable mode (hide public comparison; allocation/submit still work).
- **Recovery:** index creation is online for these sizes.
- **Data-loss:** none. **Time to restore:** minutes. **Owner action:** approve indexes when threshold hit; run `EXPLAIN` in staging first.

### Summary-table option (only if measurements require it)
- **Trigger threshold:** sustained `get_pulse` p95 > ~500ms or CPU pinned by aggregation.
- **Freshness tradeoff:** e.g. refresh every 1–5 min → public numbers lag slightly (acceptable; already "preliminary" under 25).
- **Invalidation:** scheduled `refresh` (pg_cron) or refresh-on-write threshold.
- **Failure mode:** stale/empty view → fall back to live `get_pulse` or aggregate-unavailable mode.
- **Migration plan:** additive migration `00NN_pulse_summary.sql`; keep `get_pulse` as fallback; never weaken the ≥10 suppression.

## R3 — Breaking-news event becomes a hot endpoint · **S2 · L-Med · Pre-viral (watch)**
- **Scenario:** one active event draws concentrated `get_active_events` + `record_event_response` + `get_event_tally` traffic.
- **Current controls:** `event_responses` is **unique(event_id, client_id)** → idempotent, no duplicate responses; `idx_er_event` supports the tally; events table tiny.
- **Gaps:** tally recomputed per request (no cache); no cap on event-read burst.
- **Prevention:** short client-side cache of tally; events-disabled kill switch; consider caching `get_active_events` at the edge later.
- **Containment:** events-disabled mode (hide the event module; allocation/submit unaffected).
- **Data-loss:** none (unique constraint dedupes). **Owner action:** keep one event active (see beta runbook).

## R4 — Bots / coordinated brigading inflate writes & cost · **S2 · L-Med · Pre-viral blocker**
- **Scenario:** scripted clients rotate device IDs to bypass the 6h limit, inflating votes and skewing aggregates + cost.
- **Current controls:** per-device (client_id) 6h rate limit; complete-shape + range validation; cohort suppression limits exposure; **but client_id is client-generated and clearable.**
- **Gaps:** no CAPTCHA, no IP-aware/server-side limit, no anomaly detection.
- **Prevention (infra/code, staged):** add Cloudflare Turnstile (or similar) on submit; IP-aware rate limiting at the edge or via an Edge Function; monitor for volume/shape anomalies.
- **Containment:** submission circuit breaker; temporarily raise validation strictness; disable submissions.
- **Recovery:** purge identified bad rows in Supabase (owner SQL); aggregates self-heal.
- **Data integrity:** aggregates could be skewed while attack is live — flag results as preliminary.
- **Owner action:** decide on Turnstile before broad promotion.

## R5 — Vercel or Supabase outage · **S1/S2 · L-Low · Pre-viral (plan)**
- **Scenario:** provider outage makes the app or backend unavailable.
- **Current controls:** static frontend keeps loading during a Supabase outage; the SPA already **degrades** (submissions/results/events fail with handled messages, local allocation preserved).
- **Gaps:** no maintenance page if Vercel itself is down; status not communicated.
- **Prevention:** status page/updates; keep a static fallback notice (see incident runbook).
- **Recovery:** provider-dependent; nothing to restore on our side. **Data-loss:** none.

## R6 — Env-var / deployment misconfig breaks prod after release · **S1 · L-Med → mitigated · was Pre-viral blocker**
- **Scenario:** a deploy ships without/with wrong `VITE_SUPABASE_URL`/`ANON_KEY`.
- **Previously:** `supabase.js` threw at module load → **blank white screen.**
- **Now (fixed this pass):** the client no longer throws — it logs a clear error, sets a `configError` flag, and the app renders a visible banner ("can't reach backend; local budget still works"). No blank screen.
- **Residual gap:** no automated post-deploy smoke check.
- **Prevention:** post-deploy smoke test (see release controls); Vercel env var review.
- **Owner action:** run the smoke test after each deploy.

## R7 — Frontend regression → blank screen / trapped mid-allocation · **S1 · L-Med → mitigated**
- **Now (fixed this pass):** a top-level **React error boundary** catches render errors and shows a recoverable "Something went wrong — your budget is saved locally — Refresh" screen instead of a blank page.
- **Residual gap:** boundary is app-wide (not per-section); a persistent bug still blocks until rollback.
- **Prevention:** required build/tests before deploy; preview review; fast Vercel rollback.
- **Data-loss:** none (localStorage untouched).

## R8 — localStorage corruption / incompatible saved state · **S3 · L-Low → mitigated**
- **Verified:** `loadProfile()` is wrapped in try/catch at every call site in `App.jsx`; a corrupt/incompatible profile is caught, logged, and the app falls back to a clean default. `normalizeProfile`/`mergeAlloc` also tolerate legacy shapes.
- **Residual gap:** none material; consider a `pb_profile_v3` key bump if the shape changes incompatibly in future.
- **Data-loss:** only the local (recoverable) draft, never server data.

## R9 — Admin lockout / throttle abuse · **S3 · L-Low · Later**
- **Scenario:** the global failed-login throttle can be tripped by an attacker, briefly denying the owner admin access.
- **Current controls:** bcrypt secret, login throttle, audit table; admin is **isolated from public flows** (public allocation/submit/results unaffected by admin state).
- **Gaps:** global (not per-IP) lockout = DoS vector on admin login only.
- **Prevention/Recovery:** wait out the cooldown; rotate secret; longer-term move to Supabase Auth + MFA (per-user).
- **Owner action:** don't hammer login; document cooldown.

## R10 — Bad migration / accidental deletion damages data · **S1 · L-Low · Pre-viral blocker (process)**
- **Scenario:** a destructive/incorrect migration or manual delete harms `votes`, `vote_buckets`, `events`, `event_responses`, or `admin_audit`.
- **Current controls:** append-only migration history (0001–0007); no destructive prod actions taken without review.
- **Gaps:** backup/PITR status **unverified** for the current plan (see backup-and-recovery.md); no migration preflight checklist enforced.
- **Prevention:** migration review + preflight; verify backups/PITR before launch; test a restore.
- **Recovery:** restore from backup/PITR (owner must confirm availability). **Data-loss potential: HIGH if backups absent.**
- **Owner action (critical):** verify backup/PITR now; rehearse a restore.

## R11 — Unbounded logs/requests → cost spike · **S3 · L-Med · Pre-viral (watch)**
- **Scenario:** a spike (or bot) drives Supabase/Vercel usage and cost beyond expectations; verbose logging compounds it.
- **Current controls:** minimal client logging; no analytics SDK; static assets cached by CDN.
- **Gaps:** no budget/usage alerts or caps configured yet.
- **Prevention:** budget + usage alerts; caching; retention limits; nonessential telemetry off (see viral-cost-guardrails.md).
- **Owner action:** set spend alerts before promotion.

## R12 — Future native (Capacitor) client runs old frontend vs changed backend · **S2 · L-Med · Future native concern**
- **Scenario:** iOS/Android shipped, then a backend RPC contract changes; users on old app versions break.
- **Prevention rule:** **backend changes must stay compatible with at least the currently released native app version unless a forced-upgrade mechanism exists.** Version RPCs additively; add a minimum-supported-version check + upgrade prompt before shipping native.
- **Owner action:** adopt the compatibility rule when native work begins.

---

## Highest-priority gaps (summary)
1. **Backup/PITR unverified (R10)** — verify + rehearse restore. *Pre-viral blocker.*
2. **DB compute ceiling & no circuit breaker (R1)** — plan upgrade + breaker. *Pre-viral blocker.*
3. **Bot/abuse defenses (R4)** — Turnstile + IP-aware limits. *Pre-viral blocker.*
4. **No cost alerts (R11)** — configure before promotion. *Pre-viral.*
5. **Aggregate scaling (R2)** — add `votes(bracket/region)` indexes at threshold. *Optimization.*

## Beta blockers
None new — the two blank-screen risks (R6, R7) are fixed this pass; the app degrades gracefully today. Retire the sample event (see beta runbook) before inviting testers.

## Assumptions & limits (honest)
- This audit reflects code/schema at RELIABILITY-v2.5; platform limits depend on the
  owner's **current Vercel & Supabase plans**, which are unverified here (see the owner
  questionnaire in `load-test-plan.md`).
- Free-tier compute (t4g.nano) will not absorb a large viral spike; capacity planning
  assumes a compute upgrade before promotion.
- No load test has been run; thresholds here are engineering estimates to be replaced
  by measured baselines.
