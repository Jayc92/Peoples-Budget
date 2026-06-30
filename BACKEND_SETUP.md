# The People's Budget — Backend Setup

This turns the project into a running app backed by Supabase (Postgres + RLS +
RPCs) and a deployable web build.

**Data model in one line:** anonymous raw submissions *are* stored server-side, but
public roles cannot read the underlying tables — public result RPCs return only
aggregates and suppress cohorts below 10. Your exact income and display name are
never sent to or stored on the server.

---

## 1. Create the Supabase project (~5 min)

1. Go to supabase.com → **New project**. Pick a name and a strong DB password.
2. Open **SQL Editor** and run **every migration in `supabase/migrations/` in
   numeric order** (see section 2). They build on each other — do **not** run only
   `0001`.
3. Go to **Settings → API** and copy two values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / publishable** key → `VITE_SUPABASE_ANON_KEY`
   (This key is meant to ship in the browser — RLS + the `SECURITY DEFINER`
   functions are what protect the data, not the key.)

---

## 2. Apply the migrations (in order)

Run each file's contents in the SQL Editor, oldest first. There is no `0002`.

### `0001_peoples_budget.sql`
Core schema: the `votes`, `vote_buckets`, `events`, and `event_responses` tables;
the Row Level Security baseline (RLS on, no public table policies); and the public
read/write RPCs (`submit_vote`, `get_pulse`, event functions). Tables are reachable
**only** through these functions.

### `0003_admin_hardening.sql`
Admin access hardening: a bcrypt-hashed shared admin secret stored in
`admin_config`, login throttling, an audit table, input validation, and tightened
function grants. Admin RPCs are secret-gated.

### `0004_admin_event_not_found.sql`
Correctness fix for missing-event behavior (admin event lookups return a clean
"not found" rather than failing).

### `0005_allocation_integrity.sql`
Server-side allocation rules, independent of the frontend: 50% maximum per
category, at least three funded categories per tier, exact-100% tier totals, and a
stable `invalid_allocation` error for any violation. Adds the internal
`assert_valid_alloc()` validator (revoked from `anon`/`authenticated`).

### `0006_complete_allocation_shape.sql`
Requires every permitted category key to be present in every tier (including
categories set to 0), which prevents sparse payloads from skewing public averages
across different denominators. Raises the minimum cohort threshold to **10** for
national, state, and income-range aggregates.

> Run them in this exact numeric order. The repository's `supabase/migrations/`
> folder is the source of truth and matches what is applied in production.

---

## 3. Configure and run locally

```bash
npm install
cp .env.example .env      # then paste your two values into .env
npm run dev
```

The app reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env` at
startup (restart `npm run dev` after editing `.env`). `.env` is gitignored — never
commit real secrets. Submit a budget; in Supabase → **Table editor → `votes`**
you'll see the anonymous row appear (via the service-role dashboard view — public
clients still cannot read it).

---

## 4. Deploy live (Vercel)

```bash
npm run build          # confirm it builds
```

1. Push the repo to GitHub.
2. vercel.com → **Import** the repo (framework auto-detected as Vite).
3. Add the two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in
   Vercel → Project → Settings → Environment Variables.
4. Deploy. Add your custom domain (e.g. `thepeoplesbudget.us`) under Domains, and
   update the `SHARE_URL` constant in `src/config.js` to match.

---

## Privacy & data flow (what's actually stored)

- **Raw votes exist in the database.** Each submission stores an anonymous
  per-device ID, US state, income-*range* index, filing status, and the complete
  allocation — but **not** exact income and **not** any display name.
- **Raw tables are not directly readable by public roles.** RLS is enabled with no
  public table policies; the anon/publishable key cannot select from `votes` or
  `vote_buckets`.
- **Aggregate RPCs are the only public read path.** `get_pulse(...)` returns
  per-category averages and a participant count — never individual rows.
- **Small cohorts are suppressed.** Any aggregate cohort below **10** submitted
  budgets returns no rows, so the client shows a "not enough data yet" state rather
  than a tiny, potentially identifying sample.

`getPulse(...)` returns `{ count, federal:{bucket:avg}, state:{...}, county:{...} }`
— already averaged, so the results screen reads `node[tier][bucket]` directly.

---

## Admin page

- The standalone admin page already exists at **`public/admin.html`** (served as
  `/admin.html`).
- Setup and password rotation are documented in **`docs/admin-setup.md`**.
- The password is stored **only as a bcrypt hash** in `admin_config` — never in
  source, GitHub, or chat. You set it directly in the Supabase SQL Editor.
- This is **shared-secret** authentication, not Supabase Auth. Known limitation: a
  global failed-attempt lockout can be abused as a denial-of-service against admin
  login (documented in `docs/admin-setup.md`). **Supabase Auth + MFA** remains the
  preferred future architecture for admin.

---

## Publishing a live event

Use `/admin.html`, or insert directly in Supabase → **Table editor → `events`**:

- `id`: a unique slug, e.g. `evt_2026_border_funding`
- `active`: `true`
- `badge`: e.g. `BREAKING`
- `title`, `body`, `prompt`: the question you want to pose
- `tier`: `federal` | `state` | `county`
- `bucket_id`: the category it relates to (e.g. `defense`)

Set `active` to `false` to retire it.

---

## What's done vs. what's still ahead

**Done:** shared anonymous aggregation; complete-shape, concentration-limited
allocations validated server-side; small-cohort suppression (min 10); events you can
publish without a deploy; a bcrypt shared-secret admin page; per-device rate
limiting (1 vote / 6h) and one response per event; and a data model where no client
can read individual votes.

**Still to harden before a big viral push:**
- **Stronger anti-fraud.** Device-id rate limiting is clearable. Real defense is a
  captcha (e.g. Cloudflare Turnstile) on submit, IP-aware/server-side rate limiting,
  and/or optional sign-in.
- **Admin auth.** Move from shared-secret to Supabase Auth + MFA.
- **Localized gov reference data** per state/county (currently national averages).
- **Tax-data refresh automation** so federal/state figures update each fiscal year.
- **A read cache / materialized view** if vote volume gets large.
- **Push notifications** for live events require a native (Expo) app — APNs + FCM.
