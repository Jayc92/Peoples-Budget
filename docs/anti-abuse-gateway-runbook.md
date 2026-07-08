# Anti-Abuse Gateway — Deployment & Rollback Runbook (ANTI-ABUSE-v2.8)

How to turn on the Turnstile-protected write gateway **safely**, in the exact order that
never breaks live submissions. Nothing here has been activated against production — this
is the owner-run sequence.

> Secret hygiene (non-negotiable): the Turnstile **secret key** and the Supabase
> **service-role key** are set only as **server-side function secrets**. They must never
> appear in frontend code, `.env`, Git, logs, screenshots, or chat. Only the **public
> site key** and the `VITE_TURNSTILE_ENABLED` flag live in the frontend env.

## What was built (already in the repo, inactive)
- `supabase/functions/submit-budget/` and `submit-event-response/` — public Edge Functions
  that verify a Turnstile token **server-side (fail closed)** and then call the existing
  `submit_vote` / `record_event_response` RPCs via the service-role key.
- `supabase/functions/_shared/turnstile.ts` — fail-closed verification helper (tested).
- `supabase/config.toml` — deploys both functions with `verify_jwt = false` (Turnstile is
  the gate, not a Supabase JWT).
- Frontend routes writes through the gateway **only when** `VITE_TURNSTILE_ENABLED=true`
  (otherwise it uses the direct RPC exactly as today).
- `supabase/migrations/0009_gateway_only_writes.sql` — **prepared, NOT applied**; revokes
  direct write-RPC `EXECUTE` from **`PUBLIC`, `anon`, and `authenticated`** (service_role
  keeps it). Revoking `PUBLIC` is essential: PostgreSQL grants `EXECUTE` to the implicit
  `PUBLIC` role by default, and `anon`/`authenticated` inherit `PUBLIC` — so revoking only
  `anon`/`authenticated` would leave the direct-RPC bypass open through `PUBLIC`.

## Fail-closed behavior (by design)
If Cloudflare Siteverify is unreachable, times out (10s), returns non-200, returns
malformed data, or does not return `success: true`, the write is **rejected**
(`verification_unavailable` / `turnstile_failed`). The user's budget stays saved on their
device with a clear retry message. **Public reads and local allocation always remain
available.**

## Prerequisites (owner)
1. A **Cloudflare account** → Turnstile → create a widget for your domain(s).
   - Copy the **site key** (public) and **secret key** (private).
2. Know your **production origin(s)** for CORS (e.g. `https://peoples-budget.vercel.app`
   and/or `https://thepeoplesbudget.us`) and your local dev origin (`http://localhost:5173`).
3. Supabase CLI installed and logged in; project linked.

### Cloudflare TEST keys (public, for staging/dev only — safe to use, not secrets)
- Site key **always passes**: `1x00000000000000000000AA`
- Secret key **always passes**: `1x0000000000000000000000000000000AA`
- Site key **always blocks**: `2x00000000000000000000AB`
- Secret key **always fails**: `2x0000000000000000000000000000000AA`
- Token **already spent**: `3x00000000000000000000FF`

---

## Rollout sequence (do in order; do not skip)

**1–4 are already done in the repo** (shared helper + tested, both functions built,
frontend integration behind the flag, migration 0009 prepared-not-applied). Continue:

**5. Deploy + verify in STAGING using test keys.**
```bash
# staging project (or a preview) — set function secrets
supabase secrets set TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
supabase secrets set ALLOWED_ORIGINS="http://localhost:5173"
supabase functions deploy submit-budget
supabase functions deploy submit-event-response
```
(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)
Smoke-test directly (expect `{"ok":true}` with the always-pass test token):
```bash
curl -i -X POST "$SUPABASE_URL/functions/v1/submit-budget" \
  -H "content-type: application/json" -H "Origin: http://localhost:5173" \
  -d '{"token":"XXXX.DUMMY.TOKEN","clientId":"<uuid>","region":"Pennsylvania","bracket":3,"filing":"single","alloc":{ ...complete alloc... }}'
```
Confirm: a bad/missing token → `turnstile_*`; a disallowed Origin → `forbidden_origin`.

**6. Deploy to PRODUCTION and configure real secrets.**
```bash
supabase secrets set TURNSTILE_SECRET_KEY=<your real secret>     # server-side only
supabase secrets set ALLOWED_ORIGINS="https://peoples-budget.vercel.app"   # + custom domain if live
supabase functions deploy submit-budget
supabase functions deploy submit-event-response
```

**7. Smoke-test the PRODUCTION gateway directly** (before any frontend change):
- Valid flow via a real widget token → `{"ok":true}` and a row appears (owner SQL).
- Missing token → `turnstile_missing`; forged token → `turnstile_failed`.
- Disallowed Origin → `forbidden_origin`.
Direct browser RPC still works at this point (0009 not applied) — that's expected.

**8. Deploy the FRONTEND routing writes through the gateway.**
In Vercel env: `VITE_TURNSTILE_ENABLED=true`, `VITE_TURNSTILE_SITE_KEY=<public site key>`.
Redeploy. The app now shows the widget and submits through the gateway.

**9. Verify BOTH protected write flows** on the live site:
- Complete a budget → widget → submit → result saved; tally/aggregate behaves.
- Respond to the active event → widget → response recorded.
- Fail cases: block the widget (test key `2x...AB` in staging) → clear retry message,
  local budget preserved.

**10. ONLY NOW apply migration 0009** (direct RPC lockdown):
```bash
# apply supabase/migrations/0009_gateway_only_writes.sql (dashboard or CLI)
```
0009 revokes write-RPC `EXECUTE` from **`PUBLIC`, `anon`, and `authenticated`** and keeps
`service_role`.

**11. Verify + re-test after 0009:**
- Run **`docs/anti-abuse-v2.8.1-verification.sql`** in the Supabase SQL editor. Every row
  must read **`PASS`** and the final gate must return **`all_pass = true`**. It confirms:
  - `PUBLIC` **cannot** execute `submit_vote`;
  - `anon` **cannot** execute `submit_vote`;
  - `authenticated` **cannot** execute `submit_vote`;
  - `service_role` **can** execute `submit_vote`;
  - the same four checks for `record_event_response`;
  - `get_pulse`, `get_active_events`, and `get_event_tally` remain callable by `anon`.
- Gateway writes still succeed (service-role path).
- A **direct** browser `supabase.rpc('submit_vote', …)` now **fails** (permission denied) —
  confirming the browser can no longer bypass the gateway (via `PUBLIC` or otherwise).

---

## Rollback

### Before 0009 is applied
Setting `VITE_TURNSTILE_ENABLED=false` in Vercel and redeploying returns writes to the
**direct RPC** path (the browser roles still have `EXECUTE`). This is a complete rollback
of the gateway on its own — no SQL needed.

### After 0009 is applied
0009 revoked write-RPC `EXECUTE` from `PUBLIC`, `anon`, and `authenticated`, so the direct
RPC path is closed. **Turning the flag off alone will break submissions** (the browser can
no longer reach the write RPCs). A post-0009 rollback therefore requires **both** steps:

1. **Compensating SQL** to restore execution to `anon`/`authenticated` **only** — never to
   `PUBLIC`:
   ```sql
   grant execute on function public.submit_vote(
     uuid,
     text,
     smallint,
     text,
     jsonb
   ) to anon, authenticated;

   grant execute on function public.record_event_response(
     text,
     uuid,
     text
   ) to anon, authenticated;
   ```
   > Do **not** `grant ... to public`. Re-granting `PUBLIC` would reopen the exact
   > inherited-privilege bypass that 0009 closed. Restoring `anon`/`authenticated` is
   > enough for the browser direct-RPC path, and this reopens that path — treat it as a
   > **temporary** measure and restore the gateway as soon as possible.

2. **Frontend redeploy** with `VITE_TURNSTILE_ENABLED=false` in Vercel.

Order note: applying the compensating SQL first (then redeploying the flag off) avoids a
window where the flag-off frontend calls a still-revoked RPC.

### Migration discipline
Do **not** edit `0009` after it has been applied. A post-0009 rollback must be a **new
compensating forward migration** (e.g. `00NN_restore_direct_write_grants.sql`) containing
the `anon`/`authenticated` grants above, committed to the repo like any other migration.

### Cloudflare outage causing mass fail-closed rejections
This is the intended safety posture (writes fail closed). If you must keep submissions
flowing during a prolonged Siteverify outage, use the post-0009 rollback above
(compensating SQL restoring `anon`/`authenticated` + flag off) as a temporary measure,
then restore the gateway when Cloudflare recovers.

### Bad function deploy
Redeploy the previous known-good function version.

## Verified in this pass (automated)
- Fail-closed helper: 7/7 mocked-Siteverify cases (missing/failed/non-200/malformed/network
  → reject; only `success:true` passes; missing token skips the network call).
- Gateway routing: 9/9 (writes POST to the correct function with the token; direct RPC not
  called when enabled; error codes surface; event path routes correctly).
- Production Vite build passes; with the flag **off** the app is byte-for-byte unchanged.

## Not in this pass (documented for later)
No IP storage and no browser fingerprinting were added. IP-aware rate limiting (using the
request IP transiently at the edge, never stored on the vote) is a future layer per
`docs/anti-abuse-plan.md`.

---

## CORS, public API key, and future native origins (ANTI-ABUSE-v2.8.1 §8)

### CORS allow-list (`ALLOWED_ORIGINS`)
Both write functions share one policy (`_shared/cors.ts`). `ALLOWED_ORIGINS` is a
comma-separated list; parsing **trims** whitespace, **ignores empty entries**, **drops
any entry containing `*`** (wildcards are never accepted), and **deduplicates**. Origins
are matched **exactly** — no substring/suffix/prefix matching, so
`https://peoples-budget.vercel.app.evil.com` and `https://evil-peoples-budget.vercel.app`
are both rejected. If `ALLOWED_ORIGINS` is missing/empty the list is empty and **every**
origin is denied (fail closed). Production writes never send `Access-Control-Allow-Origin: *`.

Set it explicitly, e.g.:
```
ALLOWED_ORIGINS="http://localhost:5173,https://peoples-budget.vercel.app"
```
Add the custom domain only **after** it is live; add Vercel preview URLs only if you
deliberately want them (do not broadly allow `*.vercel.app`).

**Preflight (OPTIONS):**
- Approved origin → `204` with `Access-Control-Allow-Origin` (that exact origin),
  `Vary: Origin`, `Access-Control-Allow-Methods: POST, OPTIONS`,
  `Access-Control-Allow-Headers: content-type`, and `Access-Control-Max-Age: 86400`.
- Disallowed/missing origin → `204` with **no** `Access-Control-Allow-Origin` (and no
  `Max-Age`), so the browser does not grant cross-origin access. (204-without-grant is
  intentional and tested.)

**Normal requests:** a disallowed origin → `403 forbidden_origin`; every response carries
`Vary: Origin`; there is never a wildcard grant.

### Public Supabase API-key decision — **retain `verify_jwt = false`**
The functions stay public (`verify_jwt = false`); **Turnstile is the write gate.** We do
**not** require the Supabase anon/publishable key, because:
- it is **public** (shipped in the browser bundle), so it provides no meaningful
  attacker filtering — anyone can read it;
- the frontend currently sends only `content-type` to the gateway, so requiring the key
  would add a header and a failure mode with no security benefit;
- it would add brittleness for **local development**, **key rotation**, and **future
  Capacitor** clients;
- enabling JWT verification here would be security theatre.

The **actual controls** are: server-side **Turnstile** verification (fail closed),
**exact-origin CORS** filtering, **strict request validation** (method/content-type/size/
shape/field-formats), and **migration 0009** (which makes the write RPCs callable only by
`service_role`). Because we do not require the key, `Access-Control-Allow-Headers` stays
minimal (`content-type` only) — no `apikey`/`authorization` are requested or exposed.

The anon/publishable key is never treated as a secret, and the **service-role key is
never sent to the browser** (it lives only in the Edge Function environment).

### Future Capacitor (native) origins — documented, NOT enabled now
When the native app is built, its requests may present origins such as
`capacitor://localhost` (iOS) and `http://localhost` (Android WebView). **Do not add
these to `ALLOWED_ORIGINS` yet.** Add them only when the native client is actually being
tested and the exact origin/preflight behavior for that platform+plugin version is known,
then re-run the CORS tests. Adding them prematurely would broaden access with no live
client to validate against.

---

## Edge Function dependency pinning (ANTI-ABUSE-v2.8.1 §9)

The Edge Functions no longer import `@supabase/supabase-js` from a third-party CDN
(esm.sh) at cold start. Dependencies are pinned via a single **`supabase/functions/deno.json`**
import map (the currently-recommended mechanism; import maps are legacy and `deno.json`
takes precedence):

```json
{ "imports": { "@supabase/supabase-js": "npm:@supabase/supabase-js@2.45.0" } }
```

Both functions import the stable alias `import { createClient } from "@supabase/supabase-js";`.
The version is **exactly pinned** to `2.45.0` (no `latest`, `^`, `~`, or bare `@2`) — the
same version previously used, so there is no behavior change. Deno resolves this config by
walking up from each function directory, so both functions and `_shared/` share one pinned
configuration. `supabase functions serve` / `deploy` will `deno cache` the pinned npm
dependency at deploy time (a one-time fetch from the npm registry, not a per-request CDN
call). No service-role key appears in `deno.json` or any function source — secrets remain
in the function environment only.
