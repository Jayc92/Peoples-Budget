# ANTI-ABUSE v2.8 + v2.8.1 — Changed-File Manifest & Integration Guide

**Baseline limitation (read first):** this manifest is produced from the working tree in
this workspace, **not** from your real GitHub `main` — that branch cannot be fetched here.
So **no claim of byte-for-byte parity with `main` is made.** Integrate **selectively**:
copy the anti-abuse files, and for files that already exist in `main`, **merge** the
anti-abuse changes rather than overwriting (your `main` may contain edits not present here).

---

## A. New anti-abuse files — safe to copy in (do not exist in a pre-gateway `main`)
```
supabase/functions/deno.json                          # pinned supabase-js@2.45.0 import map
supabase/functions/_shared/turnstile.ts               # fail-closed Siteverify + hostname helper
supabase/functions/_shared/turnstile.test.ts          # Deno tests for the helper
supabase/functions/_shared/cors.ts                    # exact-origin CORS allow-list
supabase/functions/_shared/respond.ts                 # JSON responder
supabase/functions/_shared/validate.ts                # shared request + field validation
supabase/functions/_shared/usStates.ts                # region allow-list (full state names)
supabase/functions/submit-budget/index.ts             # budget write gateway
supabase/functions/submit-event-response/index.ts     # event-response write gateway
supabase/migrations/0009_gateway_only_writes.sql      # PREPARED, NOT APPLIED (revokes PUBLIC/anon/authenticated)
docs/anti-abuse-gateway-runbook.md                    # deploy/rollback runbook
docs/anti-abuse-v2.8.1-verification.sql               # post-0009 privilege verification
docs/anti-abuse-v2.8.1-manifest.md                    # this file
src/components/ui/TurnstileWidget.jsx                 # Turnstile widget (renders only when enabled)
```

## B. Existing app files MODIFIED by the anti-abuse pass — **MERGE, do not overwrite**
Each was changed to add the (default-OFF) gateway path. If your `main` diverged, apply
just these deltas:
```
src/config.js                     # + TURNSTILE_ENABLED / TURNSTILE_SITE_KEY / FUNCTIONS_URL  (SHARE_URL already = vercel)
src/lib/api.js                    # + postGateway(); submitVote/recordEventResponse route via gateway when enabled
src/App.jsx                       # handlers take a token; map turnstile_* / verification_unavailable error codes
src/pages/AllocationPage.jsx      # Turnstile widget + token gating on submit (only when enabled)
src/pages/EventPage.jsx           # Turnstile widget + token gating on respond (only when enabled)
src/components/civic/LiveEventPanel.jsx   # + `disabled` prop
src/styles/components.css         # + .turnstile / .alloc__turnstile / .event-page__turnstile
.env.example                      # + VITE_TURNSTILE_ENABLED=false / VITE_TURNSTILE_SITE_KEY= (public only)
docs/beta-operations-runbook.md   # canonical-URL note updated to the vercel SHARE_URL
```

## C. Special-caution file
```
supabase/config.toml   # this workspace's copy contains ONLY the [functions.*] verify_jwt=false
                       # entries. If your real project has a config.toml with OTHER settings,
                       # MERGE the two [functions.submit-budget] / [functions.submit-event-response]
                       # blocks in — do NOT overwrite your existing config.toml.
```

## D. Unrelated files — do NOT copy unless you intentionally want this workspace's version
These come from earlier passes and are likely already in `main` (possibly diverged). The
anti-abuse integration does **not** require changing them:
```
README.md, BACKEND_SETUP.md
docs/{reliability-risk-register, load-test-plan, backup-and-recovery, observability-plan,
      incident-response-runbook, viral-cost-guardrails, security-threat-model,
      public-data-boundary, anti-abuse-plan, owner-identity-exposure,
      store-identity-decision, security-incident-runbook, beta-test-plan, admin-setup}.md
supabase/migrations/0001–0008 (already in main), tests/load/**, .github/**, vercel.json,
package.json, vite.config.js, index.html, public/admin.html, and all other src/** files
```

## Integration order (recommended)
1. Copy Group A files.
2. Merge Group B deltas into your existing files.
3. Merge Group C (`config.toml`) blocks.
4. Follow `docs/anti-abuse-gateway-runbook.md` steps 5–11. **Apply `0009` last**, then run
   `docs/anti-abuse-v2.8.1-verification.sql`.

Nothing here has been deployed; `0009` is **not** applied.
