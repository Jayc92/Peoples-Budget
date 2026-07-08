-- ============================================================================
-- ANTI-ABUSE-v2.8.1 — post-migration privilege verification
--
-- Run in the Supabase SQL editor AFTER applying 0009_gateway_only_writes.sql to
-- confirm the direct-RPC bypass is closed for public roles while the Edge
-- Functions (service_role) and public reads still work.
--
-- READ-ONLY: this script only inspects privileges (has_function_privilege) and
-- grants NOTHING. It changes no roles, functions, tables, RLS, or data.
-- Every row should read PASS. Any FAIL means 0009 was not fully applied.
-- ============================================================================

-- Write RPCs: PUBLIC / anon / authenticated must NOT execute; service_role MUST.
-- has_function_privilege resolves inherited PUBLIC grants, so these reflect the
-- effective privilege each role actually has.
with checks(label, expected, actual) as (
  values
    -- submit_vote(uuid, text, smallint, text, jsonb)
    ('submit_vote: public       cannot execute', false,
       has_function_privilege('public',        'public.submit_vote(uuid, text, smallint, text, jsonb)', 'EXECUTE')),
    ('submit_vote: anon          cannot execute', false,
       has_function_privilege('anon',          'public.submit_vote(uuid, text, smallint, text, jsonb)', 'EXECUTE')),
    ('submit_vote: authenticated cannot execute', false,
       has_function_privilege('authenticated', 'public.submit_vote(uuid, text, smallint, text, jsonb)', 'EXECUTE')),
    ('submit_vote: service_role  CAN    execute', true,
       has_function_privilege('service_role',  'public.submit_vote(uuid, text, smallint, text, jsonb)', 'EXECUTE')),

    -- record_event_response(text, uuid, text)
    ('record_event_response: public       cannot execute', false,
       has_function_privilege('public',        'public.record_event_response(text, uuid, text)', 'EXECUTE')),
    ('record_event_response: anon          cannot execute', false,
       has_function_privilege('anon',          'public.record_event_response(text, uuid, text)', 'EXECUTE')),
    ('record_event_response: authenticated cannot execute', false,
       has_function_privilege('authenticated', 'public.record_event_response(text, uuid, text)', 'EXECUTE')),
    ('record_event_response: service_role  CAN    execute', true,
       has_function_privilege('service_role',  'public.record_event_response(text, uuid, text)', 'EXECUTE')),

    -- Public READ RPCs must remain callable by anon (unchanged by 0009).
    ('get_pulse: anon CAN execute', true,
       has_function_privilege('anon', 'public.get_pulse(text, text, smallint)', 'EXECUTE')),
    ('get_active_events: anon CAN execute', true,
       has_function_privilege('anon', 'public.get_active_events()', 'EXECUTE')),
    ('get_event_tally: anon CAN execute', true,
       has_function_privilege('anon', 'public.get_event_tally(text)', 'EXECUTE'))
)
select
  label,
  expected,
  actual,
  case when actual = expected then 'PASS' else 'FAIL' end as result
from checks
order by label;

-- Overall gate: this must return a single row with all_pass = true.
with checks(expected, actual) as (
  values
    (false, has_function_privilege('public',        'public.submit_vote(uuid, text, smallint, text, jsonb)', 'EXECUTE')),
    (false, has_function_privilege('anon',          'public.submit_vote(uuid, text, smallint, text, jsonb)', 'EXECUTE')),
    (false, has_function_privilege('authenticated', 'public.submit_vote(uuid, text, smallint, text, jsonb)', 'EXECUTE')),
    (true,  has_function_privilege('service_role',  'public.submit_vote(uuid, text, smallint, text, jsonb)', 'EXECUTE')),
    (false, has_function_privilege('public',        'public.record_event_response(text, uuid, text)', 'EXECUTE')),
    (false, has_function_privilege('anon',          'public.record_event_response(text, uuid, text)', 'EXECUTE')),
    (false, has_function_privilege('authenticated', 'public.record_event_response(text, uuid, text)', 'EXECUTE')),
    (true,  has_function_privilege('service_role',  'public.record_event_response(text, uuid, text)', 'EXECUTE')),
    (true,  has_function_privilege('anon',          'public.get_pulse(text, text, smallint)', 'EXECUTE')),
    (true,  has_function_privilege('anon',          'public.get_active_events()', 'EXECUTE')),
    (true,  has_function_privilege('anon',          'public.get_event_tally(text)', 'EXECUTE'))
)
select bool_and(actual = expected) as all_pass from checks;
