# The People's Budget — Security Incident Runbook

Security-specific procedures. Pairs with the operational incident runbook
(`incident-response-runbook.md`) for roles, severity, and comms discipline.
**Never paste real secret values into tickets, chat, commits, or status pages.**

For each scenario: containment → rotation → evidence → user comms → platform notify →
legal/privacy trigger → recovery → review.

## Suspected raw-data exposure (individual votes readable)
- **Contain:** run the boundary SQL (`public-data-boundary.md`); if RLS is off or grants
  leaked, re-enable RLS and apply the SEC-1 grant revoke immediately.
- **Evidence:** capture the offending query/response (no PII in the ticket), timestamps.
- **Users/legal:** if real individual rows were exposed, treat as a privacy incident —
  assess notification obligations; consult privacy counsel.
- **Recover/Review:** confirm boundary restored; add a regression check.

## Admin credential compromise
- **Contain:** rotate the bcrypt secret now (re-run the hash insert from
  `docs/admin-setup.md` with a new value); invalidate sessions (they're session-only).
- **Evidence:** review `admin_audit` for unauthorized changes; revert bad event edits.
- **Recover:** verify only intended events are active; **prioritize Supabase Auth + MFA.**

## Supabase key leak (anon or, worse, service-role)
- **Anon/publishable key:** it's browser-safe by design; rotate only if policy requires.
- **Service-role key (critical):** if it ever existed client-side or leaked — **rotate
  immediately** in Supabase; audit for misuse; it must never be in frontend/repo.
- **Recover:** confirm new keys in Vercel env; redeploy; verify app works.

## Vercel token / GitHub token leak
- **Contain:** revoke the token in the provider; check deploy/commit logs for misuse.
- **Rotate:** issue a new scoped token; update CI secrets. **Review:** enable secret
  scanning + branch protection.

## Malicious deployment
- **Contain:** roll back to the last known-good Vercel deployment (instant).
- **Investigate:** diff the bad deploy; rotate any exposed CI creds.
- **Recover:** redeploy from a verified commit; run the post-deploy smoke test.

## Dependency compromise (supply chain)
- **Contain:** pin/rollback the offending package via the lockfile; rebuild.
- **Investigate:** `npm audit`, review install scripts/changelog; check for exfiltration.
- **Recover:** deploy clean build; add Dependabot/Renovate review.

## Bot attack / brigading
- **Contain:** flip the submission circuit breaker; enable Turnstile/IP limits.
- **Cleanup:** purge identified bot rows (owner SQL); mark affected aggregates preliminary.
- **Review:** tune thresholds; keep counts (not payloads) as evidence.

## Database tampering
- **Contain:** disable writes; snapshot current state.
- **Recover:** restore from backup/PITR if data was altered/destroyed
  (`backup-and-recovery.md`); verify row counts + integrity.

## Owner doxxing attempt
- **Contain:** review what's public (owner-identity-exposure.md); tighten WHOIS/email/
  repo owner; do not engage publicly.
- **Support:** platform abuse/harassment reporting; legal counsel if threats escalate.

## Fraudulent claim that a politician's anonymous submission was identified
- **Response (public-safe):** the app has **no authoritative way to identify any
  individual's submission**; only aggregates ≥10 are exposed, and no name/email is stored.
  Any claim tying a specific anonymous budget to a named person is **unverifiable** unless
  that person voluntarily shares it. Do not confirm/deny specifics; point to the privacy
  design. Preserve evidence of the false claim; consult counsel if defamatory.

## Standing rules
- Rotate on any suspected exposure; prefer over-rotation.
- Preserve evidence before cleanup where feasible.
- Keep status messages free of exploit detail, schema, or secrets.
- After any SEV-1/2: write a post-incident review with dated action items.
