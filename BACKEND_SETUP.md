# The People's Budget — Backend Setup

This turns the prototype into a real app with a shared database (Supabase) and a
deployable web build. Profiles stay on the user's device; only anonymous,
aggregated data lives on the server.

---

## 1. Create the Supabase project (~5 min)

1. Go to supabase.com → **New project**. Pick a name and a strong DB password.
2. Open **SQL Editor** → paste the contents of
   `supabase/migrations/0001_peoples_budget.sql` → **Run**.
   This creates the tables, locks them with Row Level Security, and installs the
   aggregate functions that are the *only* way data comes back out.
3. Go to **Settings → API** and copy two values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
   (The anon key is meant to ship in the browser — RLS + the SECURITY DEFINER
   functions are what protect the data, not the key.)

## 2. Wire it into the app

```bash
npm install @supabase/supabase-js
cp .env.example .env      # then paste your two values into .env
```

Place `src/lib/supabase.js` and `src/lib/api.js` in your project. In the main
app component, replace the old `window.storage` helpers with imports:

```js
import {
  loadProfile, saveProfile, submitVote, getPulse, getPulseAllBrackets,
  getActiveEvent, recordEventResponse, getEventTally,
} from "./lib/api";
```

Then the swaps (signatures are kept close to the originals):

| Old (artifact)                         | New (Supabase)                                            |
| -------------------------------------- | --------------------------------------------------------- |
| `window.storage` profile get/set       | `loadProfile()` / `saveProfile(p)` (now localStorage)     |
| `submitVote(region, bracket, alloc)`   | `submitVote(region, bracket, filing, alloc)`              |
| `loadAgg()` + `avgFrom(node, tier)`    | `getPulse({dim, region, bracket})` → returns averages directly; drop `avgFrom` |
| bracket filter data                    | `getPulseAllBrackets()`                                   |
| hardcoded `ACTIVE_EVENT`               | `await getActiveEvent()` on mount, into state             |
| event tally (was in shared agg)        | `getEventTally(eventId)`                                  |
| `recordEventResponse(id, choice)`      | same signature                                            |

`getPulse(...)` returns `{ count, federal:{bucket:avg}, state:{...}, county:{...} }`
— already averaged, so the results/Pulse screens read `node[tier][bucket]`
directly instead of computing sums.

## 3. Run locally

```bash
npm run dev
```

Submit a budget; in Supabase → **Table editor → votes** you'll see the row, and
the People's Pulse will reflect the new averages.

## 4. Deploy live (Vercel)

```bash
npm run build          # confirm it builds
```

1. Push the repo to GitHub.
2. vercel.com → **Import** the repo (framework auto-detected as Vite).
3. Add the two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in
   Vercel → Project → Settings → Environment Variables.
4. Deploy. Add your custom domain (e.g. `thepeoplesbudget.us`) under Domains.
   Update the `SHARE_URL` constant in the app to match.

---

## Publishing a live event

No code needed. In Supabase → **Table editor → events**, insert a row:

- `id`: a unique slug, e.g. `evt_2026_border_funding`
- `active`: `true`
- `badge`: e.g. `BREAKING`
- `title`, `body`, `prompt`: the question you want to pose
- `tier`: `federal` | `state` | `county`
- `bucket_id`: the category it relates to (e.g. `defense`)

Set `active` to `false` to retire it. (A simple password-protected admin page is
a good next step so you can publish events from your phone.)

---

## What this gives you vs. what's still ahead

**Done:** real shared aggregation, events you can publish without a deploy,
per-device rate limiting (1 vote / 6h), one event response per device, and
data that no client can read at the individual level.

**Still to harden before a big viral push:**
- **Stronger anti-fraud.** Device-id rate limiting is clearable. Real defense is
  a captcha (e.g. Cloudflare Turnstile) on submit, and/or optional sign-in.
- **Push notifications** for live events require the native (Expo) app —
  APNs (iOS) + FCM (Android).
- **Localized gov reference data** per state/county (currently national averages).
- **A read cache / materialized view** if vote volume gets large, so the Pulse
  query stays fast under load.
