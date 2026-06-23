# The People's Budget 🗳️

**Where would *you* put your taxes?**

The People's Budget is a nonpartisan civic app that lets anyone allocate their own
federal, state, and local tax dollars across real government spending categories —
then see how their choices compare to what the government *actually* does, and to
how the rest of the public leans. No spin, no media framing: just where people
genuinely put their money.

It estimates your tax bill from your salary and state, then hands you 100% of each
tax tier to distribute however you want. Submit your budget and it joins a live,
anonymous public average you can slice by income bracket and state.

---

## Why it exists

Most "what the public wants" numbers come filtered through a poll question and a
headline. This flips it: give people the actual money and the actual categories,
and let the aggregate speak for itself. Built to be deliberately **nonpartisan** —
it never tells you how to vote, it just reveals preferences.

---

## Features

- **Three-tier allocation** — Federal → State → County/Local, each with its own
  budget and real spending categories.
- **Real tax math** — 2024 IRS brackets by filing status, standard deduction,
  FICA, plus state and estimated local taxes.
- **Compare to reality** — every category shows your pick against actual FY2024
  government spending (OMB/CBO for federal, NASBO for state, Census for local).
- **The People's Pulse** — a live leaderboard of where the public funds *more* and
  *less* than the government, per tier.
- **Filterable results** — see how each income bracket and state actually leans,
  which keeps outliers honest.
- **Live events** — publish a breaking-news prompt ("how would this change your
  Defense funding?") from the database; users respond and see the live tally.
- **Privacy-first** — your income and allocations stay on your device. Only
  anonymous, aggregated data is ever stored server-side, and no client can read
  another person's individual budget.
- **Optional sharing** — a screenshot-ready summary card, never forced.

---

## Tech stack

- **Frontend:** React 18 + Vite
- **Icons:** lucide-react
- **Backend:** Supabase (Postgres + Row Level Security + RPC functions)
- **Hosting:** Vercel (or any static host)

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# paste your Supabase URL + anon key into .env (Supabase → Settings → API)

# 3. Set up the database
# In the Supabase SQL Editor, run: supabase/migrations/0001_peoples_budget.sql

# 4. Run locally
npm run dev
```

Full step-by-step (including deploy) is in **[BACKEND_SETUP.md](./BACKEND_SETUP.md)**.

---

## Project structure

```
.
├── index.html                  # Vite entry HTML
├── package.json
├── vite.config.js
├── .env.example                # copy to .env with your Supabase keys
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # the entire app UI + logic
│   └── lib/
│       ├── supabase.js         # Supabase client
│       └── api.js              # data layer (Supabase + localStorage)
├── supabase/
│   └── migrations/
│       └── 0001_peoples_budget.sql   # tables, RLS, aggregate functions, seed
└── BACKEND_SETUP.md            # detailed setup + deploy guide
```

---

## How the data model protects privacy

- **Profiles never leave the device.** Income, state, and allocations are stored in
  `localStorage` only.
- **Raw votes are locked.** Supabase Row Level Security exposes *no* direct table
  access. Data only comes back out through `SECURITY DEFINER` functions that return
  **aggregates** — so an individual budget can never be read by a client.
- **Anonymous submissions.** A vote stores an income *bracket* and US *state* only,
  tied to a random per-device id — never a name, exact income, or address.
- **Light rate limiting.** One submission per device per 6 hours; one response per
  device per event.

---

## Publishing a live event

No deploy needed. In Supabase → **Table editor → `events`**, insert a row:

| field       | example                                  |
| ----------- | ---------------------------------------- |
| `id`        | `evt_2026_border_funding`                |
| `active`    | `true`                                   |
| `badge`     | `BREAKING`                               |
| `title`     | `Emergency Border Funding Debated`       |
| `body`      | context for the prompt                   |
| `prompt`    | the question to pose                     |
| `tier`      | `federal` \| `state` \| `county`         |
| `bucket_id` | the related category, e.g. `defense`     |

Set `active` to `false` to retire it.

---

## Reference data sources

- **Federal:** FY2024 outlays by function — OMB Historical Tables / CBO Monthly
  Budget Review (total ~$6.75T).
- **State:** NASBO State Expenditure Report (national averages).
- **Local:** U.S. Census Bureau, Census of Governments (national averages).

Smallest federal categories (<1% of spending) are shown as `<1%`. State and local
figures are **national averages** — localizing them per state/county is on the
roadmap.

---

## Roadmap

- [ ] Captcha on submit (Cloudflare Turnstile) — device rate-limiting is clearable
- [ ] Password-protected admin page to publish events from a phone
- [ ] Localized state/county reference data per jurisdiction
- [ ] Live federal data via the USAspending.gov API (auto-updates each fiscal year)
- [ ] Native app (Expo) with push notifications for live events → App Store / Play
- [ ] Read cache / materialized view if vote volume gets large

---

## Disclaimer

Tax figures are **estimates** for educational and civic-engagement purposes and do
not reflect exact withholding, deductions, or credits. Government spending shares
are approximate and point-in-time (FY2024). This project is not affiliated with any
government agency, party, or campaign.
