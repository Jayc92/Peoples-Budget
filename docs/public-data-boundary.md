# The People's Budget — Public Data Boundary

What the public can and cannot reach, **verified against the live database** (not
assumed), plus SQL the owner can safely re-run any time. No credentials appear here.

## Result summary (verified this audit)

**Solid:**
- **RLS is ON for all 7 tables with ZERO policies**, and direct raw-table grants
  have been revoked. Direct access by `anon`/`authenticated` now returns
  **permission denied**.
- **All public RPCs are `SECURITY DEFINER`, owned by `postgres`, with a fixed
  `search_path`** (`public` / `public, extensions`) → no search-path injection.
- **Internal validators are NOT public-callable:** `assert_valid_alloc` and
  `admin_valid_bucket` are `anon_exec = false`.
- **`get_pulse` enforces the minimum cohort of 10** (returns no rows under 10).
- **`get_pulse_all_brackets` is dropped** and no longer exists (confirmed absent).
- Event tally RPC returns only aggregate counts, never identities.

**Defense-in-depth — CLOSED (finding SEC-1, applied in migration `0008`):**
- `anon`/`authenticated` table grants on `votes`, `vote_buckets`, `event_responses`,
  `events` have been **revoked**. Raw tables are now protected by **two independent
  layers**: no grant **and** RLS. Verified: a direct `anon` SELECT now returns
  **permission denied** (not just zero rows), while all RPC flows still work.

## Finding SEC-1 — raw-table grants revoked (defense in depth) — **APPLIED (0008)**
**Was:** `anon`/`authenticated` held broad table grants (incl. `TRUNCATE`) on the raw
tables, so protection relied on RLS alone. **Now:** those grants are revoked
(`0008_lock_raw_tables.sql`), so if RLS were ever disabled, raw votes still would not be
readable or writable directly — matching the audit goal "small blast radius if one layer
fails."

**Applied migration:**
```sql
-- 0008_lock_raw_tables.sql
revoke all privileges on table public.votes           from anon, authenticated;
revoke all privileges on table public.vote_buckets    from anon, authenticated;
revoke all privileges on table public.event_responses from anon, authenticated;
revoke all privileges on table public.events          from anon, authenticated;
```
**Verified after apply:** remaining anon/authenticated grants on those tables = **NONE**;
direct `anon` reads → **permission denied**; `submit_vote` as `anon` still **inserted a
vote + 33 buckets**; `get_pulse`/`get_active_events` still work; advisors unchanged. The
`SECURITY DEFINER` RPCs (owner `postgres`) never needed the caller grants.

---

## Owner verification SQL (safe, read-only — run in Supabase SQL editor)

```sql
-- 1) RLS on, zero policies, for every public table
select c.relname, c.relrowsecurity as rls_on,
       (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as policies
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' order by c.relname;

-- 2) Which roles can EXECUTE each function (internal validators must be false for anon)
select p.proname,
       case p.prosecdef when true then 'definer' else 'invoker' end as security,
       pg_get_userbyid(p.proowner) as owner,
       coalesce(array_to_string(p.proconfig,','),'(none)') as search_path_setting,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' order by anon_exec desc, p.proname;

-- 3) get_pulse_all_brackets must NOT exist (0 rows)
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='get_pulse_all_brackets';

-- 4) Cohort suppression: with < 10 matching votes, get_pulse returns NO rows
select count(*) as pulse_rows from public.get_pulse('all', null, null);
--   (0 rows until a cohort reaches 10 — never a tiny-sample leak)

-- 5) Raw table grants still held by anon/authenticated (target of SEC-1)
select table_name, grantee, string_agg(privilege_type, ', ') as privileges
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated')
  and table_name in ('votes','vote_buckets','event_responses','events')
group by table_name, grantee order by table_name, grantee;
```

## REST/GraphQL & storage
- PostgREST exposes tables and RPCs; raw-table verbs are denied because direct table grants have been revoked, with RLS retained as a second barrier. Only the
  intended RPCs return data (aggregates/events).
- No Storage buckets are used by this app; confirm none are public in the dashboard.
- No public view bypasses cohort suppression (no views defined; `get_pulse` is the only
  aggregate path and it suppresses < 10).

## Bottom line
The public boundary holds today via RLS + SECURITY-DEFINER RPCs. Applying **SEC-1**
removes the last single-point-of-failure on the raw tables. Re-run the SQL above after
any migration.
