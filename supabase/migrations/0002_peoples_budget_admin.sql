-- Admin base: password-gated event management (service key never leaves the server).
-- Mirrors the applied migration "peoples_budget_admin" (20260624151031).
--
-- NOTE: the originally-applied version seeded an admin secret here. That secret was
-- removed and superseded by bcrypt in 0003_admin_hardening.sql, so it is intentionally
-- NOT reproduced in source control. On a fresh setup, admin_config is created empty and
-- the owner sets the bcrypt-hashed secret privately AFTER running 0003 (see
-- docs/admin-setup.md). This file must run before 0003, which depends on admin_config.

create table if not exists public.admin_config (
  key   text primary key,
  value text not null
);
alter table public.admin_config enable row level security;  -- locked: no anon access
-- (No secret is inserted here; 0003 switches verification to a bcrypt hash the owner sets.)

create or replace function public.admin_check(p_secret text)
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.admin_config where key = 'admin_secret' and value = p_secret);
$$;

create or replace function public.admin_list_events(p_secret text)
returns setof public.events language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_secret) then raise exception 'unauthorized'; end if;
  return query select * from public.events order by starts_at desc nulls last;
end; $$;

create or replace function public.admin_upsert_event(
  p_secret    text,
  p_id        text,
  p_active    boolean,
  p_badge     text,
  p_title     text,
  p_body      text,
  p_prompt    text,
  p_tier      text,
  p_bucket_id text,
  p_ends_at   timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_secret) then raise exception 'unauthorized'; end if;
  if p_id is null or p_title is null then raise exception 'bad_request'; end if;
  insert into public.events(id, active, badge, title, body, prompt, tier, bucket_id, ends_at)
  values (p_id, coalesce(p_active,true), p_badge, p_title, p_body, p_prompt, p_tier, p_bucket_id, p_ends_at)
  on conflict (id) do update set
    active    = excluded.active,
    badge     = excluded.badge,
    title     = excluded.title,
    body      = excluded.body,
    prompt    = excluded.prompt,
    tier      = excluded.tier,
    bucket_id = excluded.bucket_id,
    ends_at   = excluded.ends_at;
end; $$;

create or replace function public.admin_set_active(p_secret text, p_id text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_secret) then raise exception 'unauthorized'; end if;
  update public.events set active = p_active where id = p_id;
end; $$;

create or replace function public.admin_delete_event(p_secret text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_secret) then raise exception 'unauthorized'; end if;
  delete from public.events where id = p_id;
end; $$;

grant execute on function public.admin_check(text)                                                              to anon, authenticated;
grant execute on function public.admin_list_events(text)                                                        to anon, authenticated;
grant execute on function public.admin_upsert_event(text,text,boolean,text,text,text,text,text,text,timestamptz) to anon, authenticated;
grant execute on function public.admin_set_active(text,text,boolean)                                            to anon, authenticated;
grant execute on function public.admin_delete_event(text,text)                                                  to anon, authenticated;
