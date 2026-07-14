// Public write gateway for live-event responses (ANTI-ABUSE-v2.8 / v2.8.1).
// Same §4 validation order as submit-budget: origin → method → content-type → size →
// parse → shape → token presence/length → Siteverify (fail closed) → RPC. The
// unique(event_id, client_id) constraint remains the secondary control. Never logs
// token/clientId; never returns raw database errors.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { verifyTurnstile, parseHostnames } from "../_shared/turnstile.ts";
import { corsHeaders, preflightHeaders, isAllowedOrigin, parseAllowedOrigins } from "../_shared/cors.ts";
import { json } from "../_shared/respond.ts";
import { readValidatedBody, validateToken, validateEventFields } from "../_shared/validate.ts";

const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
// 4 KB is ample for { token, clientId, eventId, choice }. Documented; finalized in §6.
const MAX_BODY_BYTES = 4 * 1024;
const ALLOWED_FIELDS = ["token", "clientId", "eventId", "choice"];
const REQUIRED_FIELDS = ["token", "clientId", "eventId", "choice"];

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin, ALLOWED_ORIGINS);

  // 1. origin (+ preflight)
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: preflightHeaders(origin, ALLOWED_ORIGINS) });
  if (!isAllowedOrigin(origin, ALLOWED_ORIGINS)) return json({ error: "forbidden_origin" }, 403, cors);

  // 2–6. method → content-type → size → parse → shape
  const v = await readValidatedBody(req, {
    maxBytes: MAX_BODY_BYTES,
    allowed: ALLOWED_FIELDS,
    required: REQUIRED_FIELDS,
  });
  if (!v.ok) return json({ error: v.error }, v.status, cors);
  const body = v.body;

  // 6b. field formats (§6): clientId UUID, eventId ^[a-z0-9_-]{1,64}$, choice
  // increase|same|decrease. Runs BEFORE token/Siteverify.
  const f = validateEventFields(body);
  if (!f.ok) return json({ error: f.error }, f.status, cors);

  // 7. token presence + length (no network)
  const tok = validateToken(body.token);
  if (!tok.ok) return json({ error: tok.error }, tok.status, cors);

  // 8. Cloudflare Siteverify (fail closed)
  const ver = await verifyTurnstile(tok.token, Deno.env.get("TURNSTILE_SECRET_KEY") ?? "", {
    expectedHostnames: parseHostnames(Deno.env.get("TURNSTILE_EXPECTED_HOSTNAMES")),
  });
  if (!ver.ok) {
    if (ver.reason === "missing") return json({ error: "turnstile_missing" }, 400, cors);
    if (ver.reason === "failed") return json({ error: "turnstile_failed" }, 403, cors);
    return json({ error: "verification_unavailable" }, 503, cors);
  }

  // 9. database RPC. record_event_response keeps one-response-per-device via
  // on-conflict; a well-formed but nonexistent event trips the events(id) foreign
  // key (SQLSTATE 23503) → event_not_found. No raw DB text is returned.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase.rpc("record_event_response", {
    p_event_id: body.eventId as string,
    p_client_id: body.clientId as string,
    p_choice: body.choice as string,
  });
  if (error) {
    if ((error as { code?: string }).code === "23503") return json({ error: "event_not_found" }, 404, cors);
    return json({ error: "server_error" }, 500, cors); // never leak raw DB error text
  }
  return json({ ok: true }, 200, cors);
});
