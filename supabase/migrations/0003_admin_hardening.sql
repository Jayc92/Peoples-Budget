-- ADMIN-v1.1 — harden event administration (salted bcrypt, throttle, audit, validation)
-- No password is stored by this migration. The old plaintext secret is removed.
-- Set your secret AFTER running this, privately, in the Supabase SQL editor:
--   insert into public.admin_config(key, value)
--   values ('admin_secret_hash', extensions.crypt('YOUR-NEW-PASSWORD', extensions.gen_salt('bf', 10)))
--   on conflict (key) do update set value = excluded.value;

create extension if not exists pgcrypto with schema extensions;

delete from public.admin_config where key = 'admin_secret';

create table if not exists public.admin_login_attempts (
  id bigserial primary key, at timestamptz not null default now(), success boolean not null
);
create index if not exists idx_ala_at on public.admin_login_attempts(at);

create table if not exists public.admin_audit (
  id bigserial primary key, at timestamptz not null default now(),
  action text not null, event_id text, detail jsonb
);

alter table public.admin_login_attempts enable row level security;
alter table public.admin_audit          enable row level security;

revoke all on table public.admin_config         from anon, authenticated;
revoke all on table public.admin_login_attempts from anon, authenticated;
revoke all on table public.admin_audit          from anon, authenticated;

create or replace function public.admin_valid_bucket(p_tier text, p_bucket text)
returns boolean language sql immutable set search_path = '' as $$
  select case p_tier
    when 'federal' then p_bucket = any (array[
      'social_security','medicare_medicaid','defense','debt_interest','income_security',
      'veterans','education','transportation','housing','homeland','justice','environment',
      'foreign_aid','general_gov','science','agriculture'])
    when 'state' then p_bucket = any (array[
      'st_health','st_k12','st_gov','st_higher','st_transport','st_safety',
      'st_environment','st_welfare','st_corrections'])
    when 'county' then p_bucket = any (array[
      'co_schools','co_safety','co_admin','co_health','co_water','co_roads','co_social','co_parks'])
    else false end;
$$;

create or replace function public.admin_check(p_secret text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_fails int; v_ok boolean;
begin
  delete from public.admin_login_attempts where at < now() - interval '1 day';
  select count(*) into v_fails from public.admin_login_attempts
    where success = false and at > now() - interval '15 minutes';
  if v_fails >= 10 then raise exception 'locked_out'; end if;
  select value into v_hash from public.admin_config where key = 'admin_secret_hash';
  if v_hash is null or p_secret is null then
    insert into public.admin_login_attempts(success) values (false); return false;
  end if;
  v_ok := (extensions.crypt(p_secret, v_hash) = v_hash);
  insert into public.admin_login_attempts(success) values (v_ok);
  return v_ok;
end; $$;

create or replace function public.admin_list_events(p_secret text)
returns setof public.events language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_secret) then raise exception 'unauthorized'; end if;
  return query select * from public.events order by starts_at desc nulls last;
end; $$;

create or replace function public.admin_upsert_event(
  p_secret text, p_id text, p_active boolean, p_badge text, p_title text,
  p_body text, p_prompt text, p_tier text, p_bucket_id text, p_ends_at timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_exists boolean;
begin
  if not public.admin_check(p_secret) then raise exception 'unauthorized'; end if;
  if p_id is null or p_id !~ '^[a-z0-9_-]{1,64}$' then raise exception 'invalid_id'; end if;
  if p_title is null or length(btrim(p_title)) = 0 or length(p_title) > 160 then raise exception 'invalid_title'; end if;
  if p_badge  is not null and length(p_badge)  > 40   then raise exception 'invalid_badge';  end if;
  if p_body   is not null and length(p_body)   > 2000 then raise exception 'invalid_body';   end if;
  if p_prompt is not null and length(p_prompt) > 500  then raise exception 'invalid_prompt'; end if;
  if p_tier is null or p_tier not in ('federal','state','county') then raise exception 'invalid_tier'; end if;
  if p_bucket_id is null or not public.admin_valid_bucket(p_tier, p_bucket_id) then raise exception 'invalid_bucket'; end if;
  v_exists := exists(select 1 from public.events where id = p_id);
  insert into public.events(id, active, badge, title, body, prompt, tier, bucket_id, ends_at)
  values (p_id, coalesce(p_active,true), p_badge, p_title, p_body, p_prompt, p_tier, p_bucket_id, p_ends_at)
  on conflict (id) do update set
    active = excluded.active, badge = excluded.badge, title = excluded.title,
    body = excluded.body, prompt = excluded.prompt, tier = excluded.tier,
    bucket_id = excluded.bucket_id, ends_at = excluded.ends_at;
  insert into public.admin_audit(action, event_id, detail)
  values (case when v_exists then 'update' else 'create' end, p_id,
          jsonb_build_object('title', p_title, 'tier', p_tier, 'bucket', p_bucket_id, 'active', coalesce(p_active,true)));
end; $$;

create or replace function public.admin_set_active(p_secret text, p_id text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_secret) then raise exception 'unauthorized'; end if;
  if p_id is null or p_id !~ '^[a-z0-9_-]{1,64}$' then raise exception 'invalid_id'; end if;
  if p_active is null then raise exception 'invalid_active'; end if;
  update public.events set active = p_active where id = p_id;
  insert into public.admin_audit(action, event_id, detail)
  values (case when p_active then 'activate' else 'deactivate' end, p_id, null);
end; $$;

create or replace function public.admin_delete_event(p_secret text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_secret) then raise exception 'unauthorized'; end if;
  if p_id is null or p_id !~ '^[a-z0-9_-]{1,64}$' then raise exception 'invalid_id'; end if;
  delete from public.events where id = p_id;
  insert into public.admin_audit(action, event_id, detail) values ('delete', p_id, null);
end; $$;

revoke all on function public.admin_valid_bucket(text,text) from anon, authenticated, public;
revoke all on function public.admin_check(text) from public;
revoke all on function public.admin_list_events(text) from public;
revoke all on function public.admin_upsert_event(text,text,boolean,text,text,text,text,text,text,timestamptz) from public;
revoke all on function public.admin_set_active(text,text,boolean) from public;
revoke all on function public.admin_delete_event(text,text) from public;

grant execute on function public.admin_check(text)                                                              to anon, authenticated;
grant execute on function public.admin_list_events(text)                                                        to anon, authenticated;
grant execute on function public.admin_upsert_event(text,text,boolean,text,text,text,text,text,text,timestamptz) to anon, authenticated;
grant execute on function public.admin_set_active(text,text,boolean)                                            to anon, authenticated;
grant execute on function public.admin_delete_event(text,text)                                                  to anon, authenticated;

-- direct table mutation is blocked for client roles (writes go only through SECURITY DEFINER RPCs)
revoke insert, update, delete on table public.events from anon, authenticated;
