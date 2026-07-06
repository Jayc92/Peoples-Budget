# The People's Budget — Public Data Boundary

What the public can and cannot reach, **verified against the live database** (not
assumed), plus SQL the owner can safely re-run any time. No credentials appear here.

## Result summary (verified this audit)

**Solid:**
- **RLS is ON for all 7 tables with ZERO policies** → PostgREST reads/writes on raw
  tables return **no rows** for `anon`/`authenticated`.
- **All public RPCs are `SECURITY DEFINER`, owned by `postgres`, with a fixed
  `search_path`** (`public` / `public, extensions`) → no search-path injection.
- **Internal validators are NOT public-callable:** `assert_valid_alloc` and
  `admin_valid_bucket` are `anon_exec = false`.
- **`get_pulse` enforces the minimum cohort of 10** (returns no rows under 10).
- **`get_pulse_all_brackets` is dropped** and no longer exists (confirmed absent).
- Event tally RPC returns only aggregate counts, never identities.

**Defense-in-depth GAP (finding SEC-1, see below):**
- `anon` and `authenticated` still hold broad **table grants** (SELECT/INSERT/UPDATE/
  DELETE/TRUNCATE) on `votes`, `vote_buckets`, `event_responses` (Supabase defaults).
  RLS currently blocks the REST-reachable operations, and TRUNCATE is not exposed by
  PostgREST — but the raw tables rely on a **single control (RLS)**. The
  `SECURITY DEFINER` RPCs do **not** need these grants (they run as the table owner).

## Finding SEC-1 — revoke unneeded table grants (defense in depth)
**Risk:** if RLS were ever disabled on a table (migration slip, config change), the
existing grants would immediately expose or allow modification of raw votes. Revoking
them means raw tables are protected by **two** layers (no grant **and** RLS), matching
the audit goal "small blast radius if one layer fails."

**Fix (prepared, apply with owner approval — not applied automatically):**
```sql
-- 00NN_lock_raw_tables.sql  (additive; does NOT touch RLS, RPCs, or data)
revoke all on table public.votes           from anon, authenticated;
revoke all on table public.vote_buckets    from anon, authenticated;
revoke all on table public.event_responses from anon, authenticated;
revoke all on table public.events          from anon, authenticated;
-- SECURITY DEFINER RPCs continue to work (they execute as the owner).
```
**Safe because:** every public code path goes through an RPC; the client never selects
tables directly. After applying, re-run the verification below and the app's flows.

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
- PostgREST exposes tables and RPCs; raw-table verbs return no rows under RLS. Only the
  intended RPCs return data (aggregates/events).
- No Storage buckets are used by this app; confirm none are public in the dashboard.
- No public view bypasses cohort suppression (no views defined; `get_pulse` is the only
  aggregate path and it suppresses < 10).

## Bottom line
The public boundary holds today via RLS + SECURITY-DEFINER RPCs. Applying **SEC-1**
removes the last single-point-of-failure on the raw tables. Re-run the SQL above after
any migration.
