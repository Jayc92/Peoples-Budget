// ============================================================================
//  Data layer for The People's Budget.
//  Drop-in replacement for the artifact's window.storage helpers.
//
//   * Profile (exact income, display name) => stays LOCAL on the device via
//     localStorage. Exact income and display name are never sent to the server.
//   * Votes => the FULL allocation is submitted via submit_vote, associated only
//     with an anonymous device id, an income-range index, filing status, and
//     state. Reads happen only through aggregate RPCs, so no client can ever
//     read another person's individual budget.
// ============================================================================
import { supabase } from "./supabase";
import { TURNSTILE_ENABLED, FUNCTIONS_URL } from "../config";

// POST to a Turnstile-protected Edge Function gateway. Returns on success; on any
// failure throws an Error whose `.code` is a stable public code the UI can map.
// The local budget/draft is preserved by the caller on failure.
async function postGateway(path, payload) {
  let res;
  try {
    res = await fetch(`${FUNCTIONS_URL}/${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    const e = new Error("network");
    e.code = "network";
    throw e;
  }
  let data = null;
  try { data = await res.json(); } catch { /* tolerate empty/non-JSON */ }
  if (!res.ok || (data && data.error)) {
    const e = new Error((data && data.error) || "server_error");
    e.code = (data && data.error) || "server_error";
    throw e;
  }
  return data;
}


// ── anonymous device id ─────────────────────────────────────────────────────
const CID_KEY = "pb_client_id";
export function getClientId() {
  let id = localStorage.getItem(CID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CID_KEY, id);
  }
  return id;
}

// ── profile (local only) ────────────────────────────────────────────────────
const PROFILE_KEY = "pb_profile_v2";
export function loadProfile() {
  try {
    const r = localStorage.getItem(PROFILE_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
export function saveProfile(p) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch (e) {
    console.error(e);
  }
}

// ── votes ───────────────────────────────────────────────────────────────────
// alloc = { federal:{bucketId:pct}, state:{...}, county:{...} }
export async function submitVote(region, bracket, filing, alloc, token) {
  // When the gateway is enabled, submit through the Turnstile-protected Edge
  // Function; the token is verified server-side. Otherwise use the direct RPC.
  if (TURNSTILE_ENABLED) {
    await postGateway("submit-budget", {
      token,
      clientId: getClientId(),
      region,
      bracket,
      filing,
      alloc,
    });
    return;
  }
  const { error } = await supabase.rpc("submit_vote", {
    p_client_id: getClientId(),
    p_region: region,
    p_bracket: bracket,
    p_filing: filing,
    p_alloc: alloc,
  });
  if (error) {
    if (error.message?.includes("rate_limited")) {
      const e = new Error("rate_limited");
      e.code = "rate_limited";
      throw e;
    }
    if (error.message?.includes("invalid_allocation")) {
      const e = new Error("invalid_allocation");
      e.code = "invalid_allocation";
      throw e;
    }
    throw error;
  }
}

// Returns { count, federal:{bucket:avg}, state:{...}, county:{...} }
function reshapePulse(rows) {
  const out = { count: 0, federal: {}, state: {}, county: {} };
  for (const r of rows || []) {
    if (!out[r.tier]) out[r.tier] = {};
    out[r.tier][r.bucket] = Math.round(Number(r.avg_pct));
    out.count = Math.max(out.count, Number(r.n));
  }
  return out;
}

// dim: 'all' | 'region' | 'bracket'
export async function getPulse({ dim = "all", region = null, bracket = null } = {}) {
  const { data, error } = await supabase.rpc("get_pulse", {
    p_dim: dim,
    p_region: region,
    p_bracket: bracket,
  });
  if (error) throw error;
  return reshapePulse(data);
}

// ── events ──────────────────────────────────────────────────────────────────
export async function getActiveEvent() {
  const { data, error } = await supabase.rpc("get_active_events");
  if (error) throw error;
  const e = (data || [])[0];
  if (!e) return null;
  return {
    id: e.id,
    badge: e.badge,
    title: e.title,
    body: e.body,
    prompt: e.prompt,
    tier: e.tier,
    bucketId: e.bucket_id,
  };
}

export async function recordEventResponse(eventId, choice, token) {
  if (TURNSTILE_ENABLED) {
    await postGateway("submit-event-response", {
      token,
      clientId: getClientId(),
      eventId,
      choice,
    });
    return;
  }
  const { error } = await supabase.rpc("record_event_response", {
    p_event_id: eventId,
    p_client_id: getClientId(),
    p_choice: choice,
  });
  if (error) throw error;
}

export async function getEventTally(eventId) {
  const { data, error } = await supabase.rpc("get_event_tally", { p_event_id: eventId });
  if (error) throw error;
  const t = { increase: 0, same: 0, decrease: 0 };
  for (const r of data || []) t[r.choice] = Number(r.n);
  return t;
}
