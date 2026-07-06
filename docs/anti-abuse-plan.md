# The People's Budget — Anti-Abuse & Vote-Integrity Plan

The current defense is a **client-generated device UUID + 6-hour rate limit**, enforced
server-side in `submit_vote`. This is bypassable (clear localStorage → new UUID), so it
raises the cost of abuse but does not stop a determined actor. Layered defenses below.
**Never put secret CAPTCHA keys in frontend code; never trust client-side checks alone.**

## Layers (defense in depth)
1. **Cloudflare Turnstile (or equivalent) on submit** — token issued in the browser,
   **verified server-side** (in an Edge Function or a gateway before the RPC). Secret key
   stays server-side only. Blocks most headless bots cheaply.
2. **IP-aware rate limiting** at an edge/server layer (e.g. Vercel Edge Middleware or a
   Supabase Edge Function fronting `submit_vote`) — e.g. N submits/IP/hour. IP is used
   transiently for rate limiting, **not stored on the vote** (see privacy tradeoff).
3. **Per-device limit** (existing) — `votes(client_id, created_at)`, 1 per 6h.
4. **Per-session limit** — soft cap in the SPA to curb accidental repeats (UX only, not a
   security control).
5. **Anomaly & burst detection** — monitor submission rate vs. baseline; alert on spikes
   (observability-plan). 
6. **Duplicate-pattern detection** — flag many identical allocations or a flood from one
   region/bracket in a short window; treat affected aggregates as preliminary.
7. **Suspicious allocation review** — periodic owner query for improbable uniformity.
8. **Event-response abuse controls** — `event_responses` is already **unique(event_id,
   client_id)**; add the same Turnstile/IP layer if events get hot.
9. **Emergency submission disablement** — the read-only / circuit-breaker kill switch
   (incident + reliability runbooks) stops writes instantly during an attack.
10. **Audit trail** — keep admin actions in `admin_audit`; log abuse events as counts
    (never raw payloads/PII).
11. **Appeal / cleanup for false positives** — document how a wrongly-blocked user can
    still build locally, and how the owner purges bot rows (owner SQL) so aggregates heal.

## Privacy tradeoffs (decide before storing anything new)
- **IP addresses:** treat as sensitive. Prefer using IP **only transiently** at the edge
  for rate limiting and **not** persisting it alongside votes. If any IP logging is
  needed for abuse response, store it **separately** from analytical vote data, hashed or
  truncated, with short retention and tight access — never joined to allocation content.
- **Fingerprinting:** avoid device fingerprinting; it's privacy-invasive and brittle.
  Turnstile + IP limits achieve most of the benefit without a persistent fingerprint.
- **Separate abuse identifiers from analytics:** keep any abuse-control identifier out of
  the `votes` table so the public dataset stays minimal.

## What NOT to do
- Don't weaken cohort suppression, RLS, or allocation validation to simplify abuse
  handling.
- Don't store IP on the vote row "just in case."
- Don't rely on the client UUID as if it were an identity.

## Rollout order
Turnstile (server-verified) → edge IP rate limit → monitoring/alerts → documented
cleanup procedure. Treat Turnstile + IP limits as a **pre-viral** requirement; the rest
can follow.
