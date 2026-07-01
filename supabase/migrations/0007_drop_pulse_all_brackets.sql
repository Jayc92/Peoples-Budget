-- RELEASE-v2.2 / D3 — remove the unused, unsuppressed per-bracket aggregate RPC.
-- get_pulse_all_brackets() returned per-income-bracket averages with NO minimum
-- cohort gate and was anon-callable via REST, bypassing the min-10 suppression that
-- get_pulse enforces. It is unused by the frontend. Dropping it removes the leak
-- path; all public aggregates now flow only through the suppressed get_pulse.
-- (0001 is left untouched — this append-only migration supersedes it.)
drop function if exists public.get_pulse_all_brackets();
