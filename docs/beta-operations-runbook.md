# The People's Budget — Controlled Beta Operations Runbook

Operational guide for running the controlled public beta. Pairs with
`docs/admin-setup.md` (admin password) and `docs/beta-test-plan.md` (tester script).

## One-active-event policy

**The public app displays only the newest active event. Keep exactly one event
active at a time during the controlled beta.** Multiple active events may exist in
the database, but the frontend shows only the most recent one — leaving several
active is confusing and makes it unclear which question is collecting responses.
Before activating a new event, deactivate the previous one.

(The frontend intentionally does not show multiple event cards or a carousel in the
beta; that is out of scope.)

## Canonical beta URL

Use the URL that is **verified live**. As of this writing that is:

- **https://peoples-budget.vercel.app** — verified serving the app.

`SHARE_URL` in `src/config.js` is now set to **`https://peoples-budget.vercel.app`** (the
verified-live URL). `thepeoplesbudget.us` is a **future custom domain** that has **not**
been verified as connected to the deployment — confirm it loads the app in a real browser
before advertising it or pointing `SHARE_URL` at it.

---

## Before publishing an event

- [ ] **Confirm sample event is inactive or replaced** (see "Retiring the seed sample
      event" below — do this before inviting testers).
- [ ] Event **ID is unique** (e.g. `evt_2026_border_funding`) and not reused.
- [ ] Title, body, and prompt contain **no placeholder wording** ("SAMPLE", "test",
      "lorem", "replace me", "TODO").
- [ ] `tier` (`federal` / `state` / `county`) and `bucket_id` **match** the question
      (e.g. a defense question → `federal` / `defense`).
- [ ] Only **one** event will remain active after you publish (deactivate the old one).
- [ ] Spelling and punctuation previewed.
- [ ] Question is **neutral and nonpartisan** — poses a tradeoff, doesn't advocate.

## Publish

1. In `/admin.html`, log in and **save** the event (create or edit).
2. **Activate** it (and deactivate any other active event).
3. Open the **public production URL** (the canonical beta URL above).
4. **Hard refresh** (Cmd/Ctrl+Shift+R) to bypass cache.
5. Confirm the event **appears** on Welcome with the right title/badge.
6. Open the event and **submit one test response**.
7. Confirm the **tally changes** after responding.

## Retire

1. In `/admin.html`, **deactivate** the event.
2. Hard-refresh the public URL and confirm it **disappears** from Welcome.
3. **Preserve** event history — only delete if you intentionally want to discard its
   response history (deletion is irreversible).

---

## Retiring the seed sample event (do this before inviting testers)

The database ships with one clearly-labeled seed event, `evt_sample_conflict`
(badge `SAMPLE EVENT`). It is currently **active**, so the public app shows it. Pick one:

- **A — Retire:** open `/admin.html` → deactivate `evt_sample_conflict`. The public
  app then shows no event until you activate a real one.
- **B — Replace:** edit `evt_sample_conflict` into your first real beta question
  (new title/body/prompt/tier/bucket, remove the `SAMPLE EVENT` badge). Reusing the
  row keeps things simple.
- **C — Delete:** delete `evt_sample_conflict` **only** if you don't need to keep its
  response history (it currently has a small amount of QA response history).

Fresh installations from source seed this same event and should immediately
deactivate or replace it before launch. The seed lives in migration `0001` and is
intentionally left there (applied migrations are not rewritten).

---

## Troubleshooting

**Event does not appear publicly**
- Confirm it's **active** in `/admin.html`.
- **Hard refresh**; the browser may be caching the old page.
- Check `starts_at`/`ends_at`: if `starts_at` is in the future or `ends_at` is in the
  past, it won't display even while `active`.

**Wrong event appears**
- Two events are active — the app shows the **newest**. Deactivate the others.

**Stale browser cache**
- Hard refresh, or try a private/incognito window.

**Admin login failure**
- Wrong password → re-enter carefully (see `docs/admin-setup.md`).
- Repeated failures trigger a **temporary lockout** (by design). Wait the documented
  cooldown and retry. Do not keep hammering it.

**Missing tally**
- Confirm at least one response exists; refresh. Event responses are separate from
  budget votes.

**Production environment variable issue**
- A blank page usually means `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are
  missing. In Vercel → Project → Settings → Environment Variables, confirm both are
  set, then redeploy. Locally, ensure `.env` exists and restart `npm run dev`.

---

## Security rules (non-negotiable)

- **Never** paste the real admin password into chat, source, GitHub, or docs. Set it
  only in the Supabase SQL editor per `docs/admin-setup.md`.
- **Never** put the service-role key in frontend code or `.env.example`. The frontend
  uses only the anon/publishable key.
- Keep `.env` private (it is gitignored).
- If you suspect the admin password was exposed, **rotate it immediately** (re-run the
  bcrypt `insert … on conflict do update` from `docs/admin-setup.md` with a new value).

---

## Beta monitoring (owner-only, in the Supabase SQL editor)

Run these in **Supabase → SQL Editor** (owner-privileged). Do **not** expose raw vote
rows in any public surface, and never use the service-role key in client code.

```sql
-- Total budgets submitted
select count(*) as total_votes from public.votes;

-- Submission volume over time (most recent first)
select date_trunc('hour', created_at) as hour, count(*)
from public.votes group by 1 order by 1 desc limit 24;

-- Cohort sizes (these drive the min-10 public suppression)
select bracket, count(*) from public.votes group by bracket order by bracket;
select region,  count(*) from public.votes group by region  order by count(*) desc;

-- Event engagement
select id, active, title from public.events order by active desc, starts_at desc;
select event_id, count(*) as responses
from public.event_responses group by event_id order by responses desc;

-- Admin audit trail (who changed what, when)
select * from public.admin_audit order by at desc limit 50;
```

Notes:
- **Rate-limit and invalid submissions are not stored** — `submit_vote` raises
  `rate_limited` / `invalid_allocation` and rejects them, so there are no error rows to
  query. A user hitting the 6-hour limit simply gets one recorded vote, not duplicates.
- **Suspicious patterns** to watch: an implausible spike in `votes` in a short window,
  or many identical allocations — investigate before trusting aggregates.
- Public clients can only read **aggregates** via `get_pulse` (cohorts under 10 return
  nothing); they cannot read `votes`, `vote_buckets`, or any admin table (RLS blocks
  direct access).
