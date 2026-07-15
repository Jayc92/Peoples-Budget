# Beta Feedback Operations

How tester feedback is collected during the controlled beta, and how to triage it.

## Configuring the feedback channel

The results page shows a small "Help improve the beta" section with a **Send
feedback** mailto link. It only renders a live link when an email is configured:

- Set `VITE_BETA_FEEDBACK_EMAIL` in Vercel → Project → Settings → Environment
  Variables (and locally in `.env`, see `.env.example`).
- If it's unset or blank, the section shows "Feedback channel coming soon"
  instead — the app still works normally either way. The env var is **not**
  required for `npm run build`.
- No public contact email existed in this repo before BETA-v1.2, so nothing was
  hardcoded. Pick an address you're comfortable making public (a role-based
  address, e.g. `feedback@thepeoplesbudget.us`, is preferable to a personal one —
  see `docs/owner-identity-exposure.md`).

The mailto link pre-fills a subject and a blank template the tester fills in
themselves. It never auto-attaches income, ZIP/county, device ID, or allocation
data — see the scans in the BETA-v1.2 rollout report for confirmation.

## Tester feedback categories

When triaging incoming reports, sort into:
- **Confusing copy** — wording, labels, or explanations that didn't land
- **Bugs/blockers** — something broke or prevented completing the flow
- **Mobile layout issues** — anything phone-specific
- **Turnstile friction** — verification felt confusing, slow, or annoying
- **Local ZIP/county explanation clarity** — whether LOCAL-v1A's optional field
  and disclaimer made sense
- **Feature requests** — things testers want added, not defects

## Recommended triage labels

- `blocker` — prevents completing the flow; fix immediately
- `bug` — works but incorrect; schedule a fix
- `ux-confusion` — works but unclear; candidate for copy/UX polish
- `mobile` — phone-specific issue
- `privacy-trust` — anything that made a tester uneasy about data handling; treat
  seriously even if it's a perception issue, not an actual leak
- `feature-request` — new capability, not a defect
- `later` — valid but out of scope for the current beta round

## Rules

- **Do not rush every tester suggestion into production.** A single report is a
  data point, not a mandate.
- **Separate defects from opinions.** A bug report and a stylistic preference
  get different treatment — don't let opinions block bug fixes or vice versa.
- **Collect 5–10 tester reports before deciding on BETA-v1.3**, unless a report
  is a `blocker` — blockers can be acted on immediately regardless of count.
- **Never ask testers to send exact income, raw ZIP, or other private personal
  data in feedback.** The feedback template only asks for what confused them,
  what broke, and their device/browser — nothing financial or location-specific.

See `docs/beta-feedback-template.md` for the copy/paste triage template.
