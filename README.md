# The People's Budget 🗳️

**Where would *you* put your taxes?**

The People's Budget is a nonpartisan civic app that lets anyone allocate their own
federal, state, and local tax dollars across real government spending categories —
then see how their choices compare to what the government *actually* does, and to
how the rest of the public leans. No spin, no media framing: just where people
genuinely put their money.

It estimates your tax bill from your salary and state, then hands you 100% of each
tax tier to distribute however you want. Submit your budget and it joins a live,
anonymous public average you can slice by state or income range.

---

## Why it exists

Most "what the public wants" numbers come filtered through a poll question and a
headline. This flips it: give people the actual money and the actual categories,
and let the aggregate speak for itself. Built to be deliberately **nonpartisan** —
it never tells you how to vote, it just reveals preferences.

---

## Features

- **Three independent budget tiers** — Federal, State, and County/Local, each with
  its own estimated tax amount and real spending categories.
- **Allocation integrity rules** — every tier must total exactly **100%**, no single
  category may exceed **50%**, and at least **three** categories must be funded
  (≥1%) per tier. These rules are enforced both in the UI and independently on the
  server.
- **Real tax math** — 2024 IRS brackets by filing status, standard deduction, FICA,
  plus state and estimated local taxes.
- **Compare to reality** — every category shows your pick against actual FY2024
  government spending (OMB/CBO for federal, NASBO for state, Census for local).
- **Anonymous public comparison** — on the results screen, compare your budget
  against the public aggregate, filterable by **everyone**, **your state**, or any
  selected **income range**. Small cohorts (under **10** submitted budgets) are
  suppressed server-side, so tiny samples are never shown.
- **Desktop allocation workspace** — on wider screens the category ledger scrolls
  inside a bounded workspace while the tier navigation, running totals, donut, and
  Back/Continue controls stay in view; narrow screens use normal page scrolling.
- **Shareable result card** — an optional, screenshot-ready summary with an
  explanatory caption that describes what the app is and your top priorities.
- **Live events** — publish a breaking-news prompt ("how would this change your
  Defense funding?") from the database; users respond and see the live tally.
- **Standalone admin page** — `/admin.html` manages live events, gated by a
  bcrypt-hashed shared secret verified server-side (see `docs/admin-setup.md`).
- **RPC-only data model** — Row Level Security blocks all direct table access;
  reads and writes go exclusively through `SECURITY DEFINER` functions that return
  aggregates only.

---

## Privacy model

The People's Budget separates what stays on your device from what is submitted
anonymously from what is returned publicly:

**Remains only in your browser** — your exact income, your display name/nickname,
your county, and your saved profile + local UI state (`localStorage`).

**Submitted anonymously when you publish a budget** — an anonymous per-device ID,
your US state, your income-*range* index (not exact income), your filing status,
and your complete federal/state/county allocation.

**Returned to the public** — aggregate results only. No raw individual budget rows
are ever exposed to clients, and cohorts below the threshold are suppressed.

> In short: your exact income and display name remain in your browser. When you
> submit a budget, the app sends an anonymous device ID, state, income range,
> filing status, and complete allocation. Public clients can access only aggregate
> results, and small cohorts are suppressed.

Light rate limiting applies: one submission per device per 6 hours, and one
response per device per event.

---

## Tech stack

- **Frontend:** React 18 + Vite
- **Icons:** lucide-react
- **Backend:** Supabase (Postgres + Row Level Security + `SECURITY DEFINER` RPCs)
- **Hosting:** Vercel (or any static host)

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# paste your Supabase URL + anon/publishable key into .env (Supabase → Settings → API)

# 3. Set up the database
# In the Supabase SQL Editor, run every migration in supabase/migrations/ in
# numeric order (see BACKEND_SETUP.md).

# 4. Run locally
npm run dev
```

Full step-by-step (including deploy) is in **[BACKEND_SETUP.md](./BACKEND_SETUP.md)**.
Admin setup is in **[docs/admin-setup.md](./docs/admin-setup.md)**.

---

## Project structure

```text
src/
  App.jsx           # orchestration layer: screen routing + persistence (not the whole UI)
  main.jsx          # React entry point; imports the stylesheets
  config.js         # SHARE_URL, preliminary-data threshold
  pages/            # WelcomePage, ProfilePage, AllocationPage, ResultsPage, EventPage
  components/
    layout/         # AppShell, header, footer, page header
    ui/             # buttons, fields, meters, primitives
    budget/         # allocation ledger, rows, summary, donut, tier nav
    results/        # comparison controls, community pulse, share panel
    civic/          # civic-themed presentational pieces
  data/             # budgetBuckets.js (categories), taxConstants.js (brackets/ranges)
  lib/              # api.js, supabase.js, taxEstimator.js, allocation.js
  styles/           # tokens, global, layout, components, pages
public/
  admin.html        # standalone admin page for live events
docs/
  admin-setup.md    # how to set/rotate the bcrypt-hashed admin secret
supabase/
  migrations/       # 0001, 0003, 0004, 0005, 0006 (run in numeric order)
```

`App.jsx` is the **orchestration layer** — it routes between the welcome, profile,
allocation, results, and event screens and handles localStorage persistence. The
actual UI lives in `pages/` and `components/`.

Migration files currently present:

- `0001_peoples_budget.sql`
- `0002_peoples_budget_admin.sql`
- `0003_admin_hardening.sql`
- `0004_admin_event_not_found.sql`
- `0005_allocation_integrity.sql`
- `0006_complete_allocation_shape.sql`

---

## Publishing a live event

Use the admin page (`/admin.html`), or insert directly in Supabase →
**Table editor → `events`**:

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

Completed and shipped: password-protected (bcrypt shared-secret) admin page,
allocation concentration rules (50% cap / ≥3 funded / exact 100%), complete-shape
payload validation, and small-cohort suppression.

Still ahead:

- [ ] Anti-abuse on submit (Cloudflare Turnstile or similar) — device rate-limiting is clearable
- [ ] Supabase Auth + MFA for admin (preferred over shared-secret long-term)
- [ ] IP-aware / server-side submission rate limiting
- [ ] Localized state/county reference data per jurisdiction
- [ ] Tax-data refresh automation (e.g. USAspending.gov for federal, each fiscal year)
- [ ] Read cache / materialized view if vote volume gets large
- [ ] Native app (Expo) with push notifications for live events

---

## Disclaimer

Tax figures are **estimates** for educational and civic-engagement purposes and do
not reflect exact withholding, deductions, or credits. Government spending shares
are approximate and point-in-time (FY2024). This project is not affiliated with any
government agency, party, or campaign.
