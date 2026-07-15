# Native Readiness Plan (Audit Only — Not a Build Pass)

**Status: planning/audit only.** This document records what a later iOS/Android wrapper
would require. It does **not** change the app, add Capacitor, or touch the backend.
**Do not add Capacitor until specifically instructed.**

## Current state
- The app is **Vite + React, web-first**, deployed to Vercel at
  `https://peoples-budget.vercel.app`.
- Backend is Supabase (Postgres + Edge Functions), fronted by Cloudflare Turnstile for
  budget submit and event response.
- No native wrapper, no mobile build tooling, and no Expo/React Native code exists in
  this repo (that stack belongs to Joe's separate Face Value / Gate Crasher projects,
  not to The People's Budget).

## Recommended native path: Capacitor (later)
When native wrapping is actually scheduled:
- Wrap the existing built web app with **Capacitor** rather than rewriting in React
  Native — this preserves the current component tree, styling, and Supabase client
  as-is.
- The native shell should call the **same deployed backend paths** it already calls
  today (`submit-budget`, `submit-event-response` Edge Functions, and the read-only
  RPCs) unless a future decision intentionally changes that.
- No backend rewrite is implied by adding a native wrapper.

## Turnstile inside WebViews
Cloudflare Turnstile must be **tested inside actual iOS and Android WebViews** before
any store distribution — WebView environments can behave differently than desktop/mobile
Safari or Chrome for challenge rendering and token delivery. Do not assume parity with
the web beta. This is a required verification step, not optional polish.

## ALLOWED_ORIGINS
- Today, `ALLOWED_ORIGINS` is set to `https://peoples-budget.vercel.app` only.
- A native wrapper will likely need its own origin(s) (e.g. a `capacitor://` or custom
  scheme) added to `ALLOWED_ORIGINS` before it can call the gateway successfully.
- **Do not add native origins now.** This is a future task, timed to when Capacitor is
  actually introduced, so the allow-list stays as narrow as possible until it's needed.

## Store identity (unresolved — owner decision required)
Full detail lives in `docs/store-identity-decision.md` and
`docs/owner-identity-exposure.md`; summary for this plan:
- **Individual** Apple/Google developer enrollment publicly exposes the owner's
  **personal legal name** (and address, for Google).
- **Entity/organization** enrollment keeps the personal name off public listings, at the
  cost of extra setup (legal entity formation, D‑U‑N‑S number, role-based email).
- If the owner wants personal privacy, **entity enrollment is the recommended path** —
  see the decision doc before creating any developer account.
- **Do not promise full anonymity.** Store, platform, and legal/payment records can
  still expose entity/owner information even with an organization account — this is an
  unavoidable constraint, not a gap to be engineered around.

## Developer account timing
- **Apple's free developer tier** is sufficient for local Xcode/device testing — no paid
  enrollment needed yet.
- The **paid Apple Developer Program** ($99/yr) is only needed once TestFlight or App
  Store distribution is actually happening.
- **Google Play Console enrollment can wait** until distribution is imminent; no need to
  enroll during this audit-only phase.

## Signing keys
- Native app signing keys (iOS distribution certs/provisioning profiles, Android
  keystore) must be protected once they exist — treat them with the same care as the
  Supabase service-role key and Turnstile secret: never commit them, store them outside
  the repo, and restrict access to the owner.
- No signing keys exist yet; this is a forward-looking requirement, not a current gap.

## What this plan does not do
- Does not add Capacitor, native config, or mobile build scripts to this repo.
- Does not change `ALLOWED_ORIGINS`, Edge Functions, migrations, or RPC signatures.
- Does not commit to a store-identity decision — that remains open, owner-driven, and
  tracked in `docs/store-identity-decision.md`.
