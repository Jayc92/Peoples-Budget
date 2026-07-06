# The People's Budget — Backup & Recovery

**Status: UNVERIFIED — the owner must confirm backup capability before launch.** This
project is on the Supabase **Free tier**, where automated daily backups are limited and
**point-in-time recovery (PITR) is a paid feature.** Do **not** assume backups exist.
This is the single highest-priority pre-viral action (risk R10).

## 1. Confirm current capability (owner, in Supabase dashboard)
- Open **Database → Backups**. Record: are **daily backups** listed? Is **PITR**
  enabled? What is the **retention** window?
- On Free tier, expect **no PITR** and minimal/no restorable automated backups. If so,
  a manual logical backup (below) is mandatory, and upgrading to Pro (daily backups +
  optional PITR) is strongly recommended before promotion.

## 2. Manual logical backup (works on any plan)
Run from a trusted admin machine (needs the DB connection string from
**Settings → Database**; keep it secret, never commit it):

```bash
# Full logical dump (schema + data), compressed and timestamped
pg_dump "postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres" \
  --no-owner --format=custom \
  --file="pb-backup-$(date +%Y%m%d-%H%M%S).dump"
```

To preserve the data that matters, ensure the dump includes:
`public.votes`, `public.vote_buckets`, `public.events`, `public.event_responses`,
`public.admin_audit`, `public.admin_config` (config holds only the bcrypt hash), plus
all functions/RLS (a full `pg_dump` includes these).

Data-only export of a single critical table, if needed:
```bash
pg_dump "postgresql://…/postgres" --data-only --table=public.votes --file=votes.sql
```

## 3. Encrypted storage & retention
- Encrypt backups at rest (e.g. `gpg -c pb-backup-….dump`) before uploading anywhere.
- Store off-Supabase (private object storage / encrypted drive). **Never** commit to Git.
- Retention: keep **daily for 7 days, weekly for 4 weeks** at minimum during beta;
  prune older. Adjust once volume/PITR is known.

## 4. Restore procedure
To a **staging** project first (never rehearse on prod):
```bash
pg_restore --no-owner --clean --if-exists \
  --dbname="postgresql://…staging…/postgres" pb-backup-YYYYMMDD-HHMMSS.dump
```
For PITR (Pro+): use **Database → Backups → Restore** to a timestamp just before the incident.

## 5. Restore rehearsal checklist (do once BEFORE launch)
- [ ] Create a staging Supabase project.
- [ ] Take a manual `pg_dump` of production.
- [ ] Restore it into staging.
- [ ] Verify row counts match: `select count(*) from votes;` (and vote_buckets, events, event_responses, admin_audit).
- [ ] Verify functions exist and `get_pulse`/`submit_vote` behave (run the backend tests from the release process).
- [ ] Verify RLS is on and public roles still cannot read raw tables.
- [ ] Record how long the restore took (informs incident "time to restore").

## 6. Migration safety
- **Preflight:** review the migration diff; confirm it's additive; take a fresh backup
  immediately before applying; apply to **staging** first.
- **Rollback strategy:** migrations are append-only — write a compensating forward
  migration (e.g. `00NN_revert_*.sql`) rather than editing history. For destructive
  changes, the backup from preflight is the recovery path.
- **Integrity verification after restore:** row counts per table, a sample
  `get_pulse` call, cohort suppression still returns nothing under 10, and admin login
  still works.

## 7. What must never be lost
`votes` + `vote_buckets` (the public dataset), `event_responses`, `events`, and
`admin_audit` (accountability). `admin_config` holds only a bcrypt hash — recoverable
by re-setting the secret if lost.

> Bottom line: **verify backups today and rehearse one restore before inviting a crowd.**
> Without a confirmed backup/PITR path, R10's data-loss potential is HIGH.
