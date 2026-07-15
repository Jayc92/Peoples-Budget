# BETA-v1.1 Tester Checklist

Short script to hand testers, plus owner-only notes for running the round. Pairs with
`docs/beta-operations-runbook.md`.

## Tester script

1. Open the live URL: **https://peoples-budget.vercel.app**
2. Build your budget (walk through the estimated tax breakdown).
3. Complete all three allocation levels — federal, state, and local — until each is
   marked complete.
4. Complete verification (the small widget before you can submit).
5. Submit your budget.
6. Review your results.
7. If a live event is shown, answer it.
8. Test on your phone as well as desktop, if you can.
9. If you see the optional ZIP/county field, try it or leave it blank and report
   whether the explanation feels clear.
10. Report anything confusing — copy, screens, or steps that didn't make sense.
11. Report whether verification felt understandable or annoying.

Testers don't need any technical background — plain reactions are exactly what's
useful ("I didn't know what that box was for" is a valid and helpful report).

## Owner notes (not for testers)

- Keep the beta group **small** for this round.
- Collect feedback **manually** (message, email, form — whatever's easiest to track).
- Do **not** invite a larger audience until backups/capacity are verified (see
  `docs/backup-and-recovery.md` and `docs/load-test-plan.md`).
- Confirm the **sample event is inactive** before sending the link (see the "Retiring
  the seed sample event" section of the beta operations runbook) — do not let testers
  see `evt_sample_conflict`/`SAMPLE EVENT`.
- After sending the link, **monitor Supabase, Cloudflare, and Vercel** for unusual
  volume or errors (see the "Beta monitoring" queries in the operations runbook).
- Do not interpret LOCAL-v1A as county-accurate data yet; it is a UX/data-foundation
  step (see `docs/local-accuracy-plan.md`).
