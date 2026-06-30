-- DATA-v2.1 — allocation concentration + cohort rules
-- Mirrors the migration applied as "allocation_integrity_v2_1".

-- 1) Independent server-side validation of the allocation payload.
create or replace function public.assert_valid_alloc(p_alloc jsonb)
returns void language plpgsql immutable set search_path to 'public' as $$
declare
  fed text[] := array['social_security','medicare_medicaid','defense','debt_interest','income_security','veterans','education','transportation','housing','homeland','justice','environment','foreign_aid','general_gov','science','agriculture'];
  st  text[] := array['st_health','st_k12','st_gov','st_higher','st_transport','st_safety','st_environment','st_welfare','st_corrections'];
  co  text[] := array['co_schools','co_safety','co_admin','co_health','co_water','co_roads','co_social','co_parks'];
  v_tier text; v_sub jsonb; v_permitted text[]; r record; v_val numeric; v_sum numeric; v_funded int;
begin
  if p_alloc is null or jsonb_typeof(p_alloc) <> 'object' then raise exception 'invalid_allocation'; end if;
  if length(p_alloc::text) > 4000 then raise exception 'invalid_allocation'; end if;
  if (select count(*) from jsonb_object_keys(p_alloc)) <> 3
     or not (p_alloc ? 'federal' and p_alloc ? 'state' and p_alloc ? 'county') then
    raise exception 'invalid_allocation';
  end if;
  foreach v_tier in array array['federal','state','county'] loop
    v_sub := p_alloc -> v_tier;
    if v_sub is null or jsonb_typeof(v_sub) <> 'object' then raise exception 'invalid_allocation'; end if;
    v_permitted := case v_tier when 'federal' then fed when 'state' then st else co end;
    v_sum := 0; v_funded := 0;
    for r in select key, value from jsonb_each(v_sub) loop
      if not (r.key = any(v_permitted)) then raise exception 'invalid_allocation'; end if;
      if jsonb_typeof(r.value) <> 'number' then raise exception 'invalid_allocation'; end if;
      v_val := (r.value #>> '{}')::numeric;
      if v_val < 0 or v_val > 50 then raise exception 'invalid_allocation'; end if;
      v_sum := v_sum + v_val;
      if v_val >= 1 then v_funded := v_funded + 1; end if;
    end loop;
    if abs(v_sum - 100) > 0.001 then raise exception 'invalid_allocation'; end if;
    if v_funded < 3 then raise exception 'invalid_allocation'; end if;
  end loop;
end; $$;
revoke all on function public.assert_valid_alloc(jsonb) from public;
revoke all on function public.assert_valid_alloc(jsonb) from anon;
revoke all on function public.assert_valid_alloc(jsonb) from authenticated;

-- 2) submit_vote validates independently of the frontend.
create or replace function public.submit_vote(p_client_id uuid, p_region text, p_bracket smallint, p_filing text, p_alloc jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; v_tier text; v_bucket text; v_recent int;
begin
  if p_client_id is null or p_alloc is null then raise exception 'bad_request'; end if;
  perform public.assert_valid_alloc(p_alloc);
  select count(*) into v_recent from public.votes
   where client_id = p_client_id and created_at > now() - interval '6 hours';
  if v_recent >= 1 then raise exception 'rate_limited'; end if;
  insert into public.votes(client_id, region, bracket, filing, alloc)
  values (p_client_id, p_region, p_bracket, p_filing, p_alloc) returning id into v_id;
  for v_tier in select jsonb_object_keys(p_alloc) loop
    for v_bucket in select jsonb_object_keys(p_alloc -> v_tier) loop
      insert into public.vote_buckets(vote_id, region, bracket, tier, bucket, pct)
      values (v_id, p_region, p_bracket, v_tier, v_bucket, round((p_alloc -> v_tier ->> v_bucket)::numeric));
    end loop;
  end loop;
end; $$;
grant execute on function public.submit_vote(uuid, text, smallint, text, jsonb) to anon, authenticated;

-- 3) get_pulse suppresses small cohorts server-side (no rows returned).
create or replace function public.get_pulse(p_dim text default 'all', p_region text default null, p_bracket smallint default null)
returns table(tier text, bucket text, avg_pct numeric, n bigint)
language plpgsql stable security definer set search_path to 'public' as $$
declare v_cohort bigint; c_min_cohort constant int := 5;
begin
  select count(*) into v_cohort from public.votes v
   where (p_dim='all') or (p_dim='region' and v.region=p_region) or (p_dim='bracket' and v.bracket=p_bracket);
  if coalesce(v_cohort,0) < c_min_cohort then return; end if;
  return query
    select vb.tier, vb.bucket, avg(vb.pct)::numeric as avg_pct, count(distinct vb.vote_id) as n
    from public.vote_buckets vb
    where (p_dim='all') or (p_dim='region' and vb.region=p_region) or (p_dim='bracket' and vb.bracket=p_bracket)
    group by vb.tier, vb.bucket;
end; $$;
grant execute on function public.get_pulse(text, text, smallint) to anon, authenticated;
