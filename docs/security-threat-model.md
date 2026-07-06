# The People's Budget — Security Threat Model (STRIDE)

Scope: web beta + planned Capacitor iOS/Android on the same Supabase backend. Goal is
**defense in depth**, not "unhackable." Re-review before broad launch and native ship.

## Assets (what we protect)
Raw votes; vote buckets; event responses; event definitions; aggregate results; admin
credential (bcrypt hash); audit records; Supabase project; Vercel project; GitHub repo;
environment variables; domain/DNS; future Apple/Google signing credentials; source code;
**owner identity**; user trust.

## Actors (who might attack)
Normal & curious-technical users; political opposition researchers; activists; trolls;
bot operators; credential-stuffing attackers; malicious insiders; compromised
dependencies; automated scanners.

## Entry points
Public SPA; Supabase RPC/REST endpoints; admin page; Vercel deployment; GitHub repo;
domain/DNS; browser localStorage; future native webviews; deep links; push endpoints;
app-store listings; analytics/error monitoring.

## STRIDE analysis (path · likelihood · impact · existing control · gap · detection · mitigation · residual · priority)

### Spoofing
- **Fake/duplicate submitters (rotating client_id).** Med · Med. Existing: per-device 6h
  limit; complete-shape validation. Gap: client_id is client-generated. Detect: volume/
  shape anomalies. Mitigate: Turnstile + IP-aware limits (anti-abuse plan). Residual:
  determined actors can still submit some; cohort suppression + aggregation limit harm.
  **P1/P2.**
- **Admin impersonation.** Low · High. Existing: bcrypt secret + throttle + audit. Gap:
  shared secret, no MFA. Mitigate: Supabase Auth + MFA. Residual: secret theft until
  migrated. **P2.**

### Tampering
- **Direct raw-table writes/deletes via REST.** Low · High. Existing: RLS (no policy)
  blocks REST verbs; writes only via `submit_vote`. Gap: broad table grants remain (SEC-1)
  — RLS is the sole control; TRUNCATE granted (not REST-exposed). Mitigate: **revoke
  grants (SEC-1)**. Detect: audit + row-count monitoring. Residual: low after SEC-1.
  **P1.**
- **Malicious allocation payloads.** Med · Low. Existing: `assert_valid_alloc` (exact
  tiers/categories, 0–50, sum 100, ≥3 funded, ≤4000 chars) server-side. Gap: none
  material. Residual: minimal. **OK.**
- **Deployment tampering (bad deploy).** Low · High. Existing: manual deploys. Gap: no
  branch protection/required checks. Mitigate: release controls (incident runbook).
  **P2.**

### Repudiation
- **Admin actions unattributable.** Low · Med. Existing: `admin_audit` table. Gap:
  shared secret → all admins look identical. Mitigate: per-user auth (Supabase Auth).
  Residual: acceptable for solo owner now. **P3.**

### Information disclosure  *(the core privacy concern)*
- **Reading raw individual votes.** Low · **Critical**. Existing: RLS + SECURITY-DEFINER
  RPCs; verified anon gets 0 rows. Gap: SEC-1 grants. Mitigate: SEC-1. Detect: boundary
  SQL. Residual: low after SEC-1. **P1.**
- **Tiny-cohort re-identification via aggregates.** Low · High. Existing: `get_pulse`
  suppresses < 10; `get_pulse_all_brackets` dropped. Gap: none known. Residual:
  aggregates of small-but-≥10 cohorts still coarse — acceptable. **OK (monitor).**
- **Correlating a submission to a person.** Low–Med · High. Existing: no name/email/IP
  stored; only state + income *range* + filing + allocation + coarse-ish timestamp +
  client_id. Gap: `created_at` is full-precision; client_id ties a device's votes over
  time. Mitigate: data-minimization (coarse timestamps, retention, rotate/segregate
  client_id) — see named-person analysis. Residual: **cannot guarantee
  non-re-identifiability** with external knowledge; stated honestly. **P2.**
- **Secret/owner-identity leakage** (code/Git/logs/metadata). See secret + owner-identity
  audits. Working tree is clean; Git history/metadata are owner actions. **P1–P3.**

### Denial of service
- **Submission/read flood exhausts DB.** Med · High. Existing: static SPA absorbs load;
  per-device limit. Gap: nano compute; no circuit breaker. Mitigate: compute upgrade +
  kill switch (reliability docs). Residual: capacity-bound. **P2.**
- **Admin global lockout DoS.** Low · Low(scope: admin only). Existing: throttle isolates
  public flows. Gap: global (not per-IP) lockout. Mitigate: per-user auth. Residual:
  brief admin denial only. **P3.**

### Elevation of privilege
- **Calling internal/admin functions as anon.** Low · High. Existing: `assert_valid_alloc`
  & `admin_valid_bucket` not anon-executable; admin RPCs secret-gated; fixed search_path.
  Gap: none found. Residual: low. **OK.**
- **Search-path / definer abuse.** Low · High. Existing: all definer functions pin
  `search_path`. Gap: none. **OK.**

## Native-specific (future, pre-store)
Deep-link parameter injection; insecure native storage of local profile; push-endpoint
auth; webview running an old frontend against a changed backend (enforce the
backward-compatibility rule + min-version check); privacy manifests (Apple) declaring
data use accurately. **P3.**

## Top priorities out of this model
1. **SEC-1** revoke raw-table grants (P1). 2. Anti-abuse (Turnstile + IP limits, P1/P2).
3. Admin **Supabase Auth + MFA** (P2). 4. Data-minimization for correlation resistance
(P2). 5. Owner-identity cleanup (P1–P3). 6. Frontend security headers (P2).

## Honest residual risks (cannot be eliminated)
- Anonymous ≠ impossible to re-identify given enough external data.
- A motivated bot operator can submit *some* votes; we limit blast radius, not existence.
- Shared-secret admin is weaker than per-user MFA until migrated.
- Platform (Vercel/Supabase) compromise is outside our control.
- App-store/payment/legal enrollment may require *some* real owner identity (see store
  decision) — anonymity there cannot be promised.

---

## Frontend security headers (§9)
`vercel.json` ships safe, non-breaking headers now: `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY` (clickjacking), `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (camera/mic/geo/FLoC off), and `Strict-Transport-Security` (HSTS).

**Content-Security-Policy** is intentionally **not shipped yet** — an untested CSP can
white-screen the SPA. Enable it on a **Vercel preview** first, confirm the app loads and
Supabase calls work, then promote. Recommended starting policy:

```
Content-Security-Policy:
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'none';
  form-action 'self';
  img-src 'self' data:;
  font-src 'self';
  style-src 'self' 'unsafe-inline';           /* React inline styles */
  script-src 'self';                            /* relax only if a Vite inline bootstrap needs a nonce/hash */
  connect-src 'self' https://*.supabase.co;     /* REQUIRED so Supabase RPC calls work */
```
If anything breaks, the usual culprit is `script-src` (add a nonce/hash or, temporarily,
`'unsafe-inline'`) — never remove `connect-src https://*.supabase.co`.

Other frontend notes (verified): no `dangerouslySetInnerHTML`/`eval`; share text is
copied via the clipboard API (no HTML injection); localStorage reads are try/caught;
production **source maps are off**; no service worker. XSS surface is minimal.
