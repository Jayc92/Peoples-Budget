-- ADMIN-v1.1.1 — raise event_not_found and skip audit when the event does not exist.
-- Corrective follow-up to 0003_admin_hardening.sql. Same function signatures
-- (CREATE OR REPLACE preserves the grants/revokes established in 0003).

create or replace function public.admin_set_active(p_secret text, p_id text, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_secret) then raise exception 'unauthorized'; end if;
  if p_id is null or p_id !~ '^[a-z0-9_-]{1,64}$' then raise exception 'invalid_id'; end if;
  if p_active is null then raise exception 'invalid_active'; end if;
  if not exists (select 1 from public.events where id = p_id) then raise exception 'event_not_found'; end if;
  update public.events set active = p_active where id = p_id;
  insert into public.admin_audit(action, event_id, detail)
  values (case when p_active then 'activate' else 'deactivate' end, p_id, null);
end; $$;

create or replace function public.admin_delete_event(p_secret text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.admin_check(p_secret) then raise exception 'unauthorized'; end if;
  if p_id is null or p_id !~ '^[a-z0-9_-]{1,64}$' then raise exception 'invalid_id'; end if;
  if not exists (select 1 from public.events where id = p_id) then raise exception 'event_not_found'; end if;
  delete from public.events where id = p_id;
  insert into public.admin_audit(action, event_id, detail) values ('delete', p_id, null);
end; $$;
