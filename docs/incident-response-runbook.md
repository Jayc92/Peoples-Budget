# The People's Budget — Incident Response Runbook

How to respond when something breaks. Pairs with the risk register (causes) and the
observability plan (detection). Written for a **solo founder** who rotates roles.

## Severity levels
- **SEV-1** — complete outage, data exposure, or destructive data loss.
- **SEV-2** — submissions, results, or admin materially impaired for many users.
- **SEV-3** — a degraded feature or a limited segment; workaround exists.
- **SEV-4** — minor defect with a workaround.

## Roles (and how one person covers them)
Incident Commander (decides), Technical Lead (fixes), Communications Lead (updates
users), Scribe (records). **Solo:** work in short cycles — (1) put on the *Commander*
hat: assess severity and decide the next single action; (2) *Tech* hat: do it;
(3) *Scribe* hat: jot the timestamp + what happened in the timeline; (4) *Comms* hat:
post one status update if SEV-1/2. Repeat. When overwhelmed, **stabilize first**
(flip a kill switch) before investigating root cause.

## Lifecycle
**Detect** (alert/report) → **Declare** (assign severity, start a timeline) →
**Stabilize** (kill switch / rollback to stop harm) → **Investigate** (find cause) →
**Mitigate** (apply fix) → **Recover** (restore normal mode) → **Validate** (smoke
test) → **Communicate** (resolved) → **Review** (post-incident).

## Required artifacts (keep in a private doc per incident)
- **Timeline** — timestamped events and actions.
- **Decision log** — what was decided and why.
- **Customer-impact statement** — who was affected, how, how long.
- **Recovery verification** — the smoke test you ran to confirm fixed.
- **Post-incident review** — cause, what worked, what didn't.
- **Action items** — each with an owner and a date.

---

## Graceful degradation & kill switches (design)

The app **already degrades** without any switch: if aggregate/event/submission RPCs
fail, they're caught and the user keeps their local allocation (verified in `App.jsx`).
The modes below add *deliberate* control. **Prefer environment-controlled or
remotely-controlled flags. Never ship an unauthenticated public switch an attacker
could flip.** Recommended mechanism: a small **Vercel environment variable** per flag
(e.g. `VITE_SUBMISSIONS_ENABLED=false`) applied via redeploy, or a signed/edge-config
value — changing it requires owner access, not a public endpoint.

| Mode | Trigger | Owner action | User-facing message | Still works | Restore | Data-loss |
|---|---|---|---|---|---|---|
| **Read-only** | DB write pressure/abuse (R1/R4) | set submissions flag off + redeploy | "Submitting is paused briefly — you can still build and copy your budget." | load, profile, allocation, results | flag on + redeploy | none (local kept) |
| **Aggregate-unavailable** | `get_pulse` slow/erroring (R2) | hide public comparison via flag | "Public results are temporarily unavailable." | everything except public comparison | flag on | none |
| **Events-disabled** | event endpoints failing (R3) | hide event module via flag | (event simply absent) | full allocation/submission | flag on | none (unique constraint dedupes) |
| **Submission circuit breaker** | error rate/CPU/abuse over threshold | temporary flag (or edge rule) off | same as read-only | build/copy locally | flag on when healthy | none |
| **Maintenance** | major incident (R5/R10) | serve a maintenance notice | "Down for brief maintenance — back shortly." | nothing dynamic (by design) | remove notice | none |
| **Static fallback** | SPA/backend unavailable | a static `maintenance.html` at the edge | informational page | static info only | restore deploy | none |

> Implementation note (future, low-risk): the frontend can read a build-time flag like
> `import.meta.env.VITE_SUBMISSIONS_ENABLED` and hide the submit action + show the
> message when false. Flags must **default to safe/on** so a missing value never
> disables the app. This pass documents the design; it does not add the flags.

---

## Communication templates (avoid exploitable detail)

- **Investigating:** "We're aware of an issue affecting [submitting budgets / results]
  and are investigating. Your saved progress on your device is safe."
- **Identified:** "We've identified the issue and are working on a fix. [Feature] may be
  temporarily unavailable."
- **Monitoring:** "A fix is in place and we're monitoring. Things should be back to
  normal — thanks for your patience."
- **Resolved:** "This is resolved. Everything should be working normally again."
- **Post-incident summary (optional, public-safe):** "On [date], [feature] was
  unavailable for about [duration] due to [high demand / a configuration issue]. No
  submitted data was lost. We've [action] to reduce the chance of a repeat."

Never disclose secrets, exact exploit steps, connection strings, or internal thresholds.

---

## Release & rollback controls

**Deploy process**
- Protect the `main` branch; deploy only from `main`.
- Required checks before merge: `npm run build`, logic/integration/SSR tests green.
- Review the **Vercel preview** deployment before promoting.
- **Migration review:** apply new migrations to **staging** first; confirm additive;
  take a backup immediately before applying to prod (see backup-and-recovery.md).

**Release checklist**
- [ ] Build + tests pass locally/CI.
- [ ] Preview deploy reviewed.
- [ ] Env vars present in Vercel (both Supabase values).
- [ ] Any DB migration applied to staging and reviewed.
- [ ] Backup taken if the release includes a migration.

**Post-deploy smoke test** (2 min, on the live URL)
- [ ] Welcome loads, no console errors, config banner absent.
- [ ] Build a budget → submit → Results renders.
- [ ] Under-10 public state shows "not enough data," not 0%.
- [ ] Active event appears and a response records.

**Rollback**
- **Criteria:** blank screen, broken submission/results, or error-rate alert after deploy.
- **Frontend:** Vercel → Deployments → **promote the previous good deployment** (instant).
- **Backend compatibility:** if a migration is implicated, prefer a compensating forward
  migration; restore from backup only for destructive damage.
- **Native (future):** **backend changes must remain compatible with at least the
  currently released native app version unless a forced-upgrade mechanism exists.**
