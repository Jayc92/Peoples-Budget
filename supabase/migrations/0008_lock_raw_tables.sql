-- ============================================================================
-- SECURITY-v2.6.1 — Lock raw tables behind RPC-only access
--
-- Public application traffic must use the approved SECURITY DEFINER RPCs
-- (submit_vote, get_pulse, get_active_events, record_event_response,
-- get_event_tally). Those functions execute as their owner, so they do NOT
-- rely on caller table grants. The direct table privileges below are therefore
-- unnecessary and create a single-control risk if RLS is ever weakened.
--
-- This migration is additive hardening and safe to re-run.
-- It does not touch RLS, policies, RPCs, data, tax logic, validation,
-- the cohort threshold, aggregate semantics, or admin auth.
-- ============================================================================

revoke all privileges on table public.votes
  from anon, authenticated;

revoke all privileges on table public.vote_buckets
  from anon, authenticated;

revoke all privileges on table public.event_responses
  from anon, authenticated;

revoke all privileges on table public.events
  from anon, authenticated;
