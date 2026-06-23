-- ============================================================================
--  THE PEOPLE'S BUDGET — Supabase schema (v1)
--  Run this in the Supabase SQL Editor, or via `supabase db push`.
--
--  Design principles:
--   * PRIVACY: clients can NEVER read individual votes. Raw rows are locked by
--     RLS; the only way data comes back out is through aggregate RPC functions.
--   * HONEST DATA: we keep raw (anonymous) votes server-side so brigading can be
--     detected/cleaned later, plus a light per-device rate limit on submission.
--   * NO PII: we store an income *bracket* and US *state* only — never exact
--     income, name, or location. The user's profile stays on their own device.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------------

-- One row per submitted budget (anonymous).
create table if not exists public.votes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  client_id   uuid not null,                       -- anonymous per-device id
  region      text,                                -- US state (nullable)
  bracket     smallint,                            -- income bracket index 0..7
  filing      text check (filing in ('single','mfj','hoh')),
  alloc       jsonb not null                       -- { federal:{}, state:{}, county:{} }
);
create index if not exists idx_votes_client on public.votes(client_id, created_at);

-- Normalized allocation rows (exploded from votes.alloc) for fast aggregation.
create table if not exists public.vote_buckets (
  vote_id  uuid not null references public.votes(id) on delete cascade,
  region   text,
  bracket  smallint,
  tier     text not null,                          -- 'federal' | 'state' | 'county'
  bucket   text not null,                          -- bucket id, e.g. 'defense'
  pct      smallint not null,
  primary key (vote_id, tier, bucket)
);
create index if not exists idx_vb_tier_bucket on public.vote_buckets(tier, bucket);
create index if not exists idx_vb_region       on public.vote_buckets(region);
create index if not exists idx_vb_bracket      on public.vote_buckets(bracket);

-- Live events you publish (e.g. a breaking news prompt).
create table if not exists public.events (
  id         text primary key,                     -- slug, e.g. 'evt_2026_conflict'
  active     boolean not null default true,
  badge      text,
  title      text not null,
  body       text,
  prompt     text,
  tier       text,
  bucket_id  text,
  starts_at  timestamptz default now(),
  ends_at    timestamptz
);

-- One Increase/Same/Decrease response per device per event.
create table if not exists public.event_responses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  event_id    text not null references public.events(id) on delete cascade,
  client_id   uuid not null,
  choice      text not null check (choice in ('increase','same','decrease')),
  unique (event_id, client_id)
);
create index if not exists idx_er_event on public.event_responses(event_id);

-- ---------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
--    Enable RLS with NO policies on raw tables => no direct anon access at all.
--    All reads/writes happen through SECURITY DEFINER functions below, which
--    run as the table owner and bypass RLS in a controlled way.
-- ---------------------------------------------------------------------------
alter table public.votes            enable row level security;
alter table public.vote_buckets     enable row level security;
alter table public.events           enable row level security;
alter table public.event_responses  enable row level security;

-- ---------------------------------------------------------------------------
-- 3. FUNCTIONS (the only public surface)
-- ---------------------------------------------------------------------------

-- Submit a budget. Explodes alloc into vote_buckets. Light rate limit: 1 / 6h.
create or replace function public.submit_vote(
  p_client_id uuid,
  p_region    text,
  p_bracket   smallint,
  p_filing    text,
  p_alloc     jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_tier   text;
  v_bucket text;
  v_recent int;
begin
  if p_client_id is null or p_alloc is null then
    raise exception 'bad_request';
  end if;

  select count(*) into v_recent
  from public.votes
  where client_id = p_client_id
    and created_at > now() - interval '6 hours';
  if v_recent >= 1 then
    raise exception 'rate_limited';
  end if;

  insert into public.votes(client_id, region, bracket, filing, alloc)
  values (p_client_id, p_region, p_bracket, p_filing, p_alloc)
  returning id into v_id;

  for v_tier in select jsonb_object_keys(p_alloc) loop
    for v_bucket in select jsonb_object_keys(p_alloc -> v_tier) loop
      insert into public.vote_buckets(vote_id, region, bracket, tier, bucket, pct)
      values (
        v_id, p_region, p_bracket, v_tier, v_bucket,
        round((p_alloc -> v_tier ->> v_bucket)::numeric)
      );
    end loop;
  end loop;
end;
$$;

-- Aggregate averages by tier/bucket for a filter. n = number of votes in scope.
create or replace function public.get_pulse(
  p_dim     text     default 'all',     -- 'all' | 'region' | 'bracket'
  p_region  text     default null,
  p_bracket smallint default null
) returns table(tier text, bucket text, avg_pct numeric, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select vb.tier,
         vb.bucket,
         avg(vb.pct)::numeric         as avg_pct,
         count(distinct vb.vote_id)   as n
  from public.vote_buckets vb
  where (p_dim = 'all')
     or (p_dim = 'region'  and vb.region  = p_region)
     or (p_dim = 'bracket' and vb.bracket = p_bracket)
  group by vb.tier, vb.bucket;
$$;

-- Averages grouped by every bracket at once (for the bracket filter UI).
create or replace function public.get_pulse_all_brackets()
returns table(bracket smallint, tier text, bucket text, avg_pct numeric, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select vb.bracket, vb.tier, vb.bucket,
         avg(vb.pct)::numeric        as avg_pct,
         count(distinct vb.vote_id)  as n
  from public.vote_buckets vb
  where vb.bracket is not null
  group by vb.bracket, vb.tier, vb.bucket;
$$;

-- Currently active events.
create or replace function public.get_active_events()
returns setof public.events
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.events
  where active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >  now())
  order by starts_at desc;
$$;

-- Record/replace a single device's response to an event.
create or replace function public.record_event_response(
  p_event_id  text,
  p_client_id uuid,
  p_choice    text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.event_responses(event_id, client_id, choice)
  values (p_event_id, p_client_id, p_choice)
  on conflict (event_id, client_id)
  do update set choice = excluded.choice, created_at = now();
end;
$$;

-- Tally of responses for an event.
create or replace function public.get_event_tally(p_event_id text)
returns table(choice text, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select choice, count(*) as n
  from public.event_responses
  where event_id = p_event_id
  group by choice;
$$;

-- ---------------------------------------------------------------------------
-- 4. GRANTS — expose ONLY the functions to anonymous + signed-in users.
-- ---------------------------------------------------------------------------
grant execute on function public.submit_vote(uuid,text,smallint,text,jsonb)   to anon, authenticated;
grant execute on function public.get_pulse(text,text,smallint)                to anon, authenticated;
grant execute on function public.get_pulse_all_brackets()                     to anon, authenticated;
grant execute on function public.get_active_events()                          to anon, authenticated;
grant execute on function public.record_event_response(text,uuid,text)        to anon, authenticated;
grant execute on function public.get_event_tally(text)                        to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. SEED — one clearly-labeled sample event (edit/replace before launch).
-- ---------------------------------------------------------------------------
insert into public.events (id, active, badge, title, body, prompt, tier, bucket_id)
values (
  'evt_sample_conflict', true, 'SAMPLE EVENT',
  'Overseas Military Conflict Escalates',
  'Imagine a major overseas conflict involving U.S. forces intensifies, and lawmakers debate emergency spending. (Sample event — replace with real ones as news breaks.)',
  'If the choice were yours, how would this change your National Defense funding?',
  'federal', 'defense'
)
on conflict (id) do nothing;
