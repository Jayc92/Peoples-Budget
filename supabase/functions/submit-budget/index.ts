// Public write gateway for budget submissions (ANTI-ABUSE-v2.8 / v2.8.1).
// Validation order (§4): origin → method → content-type → size → parse → shape →
// token presence/length → Cloudflare Siteverify (fail closed) → submit_vote RPC.
// Obviously-malformed requests never reach Cloudflare or the database. The existing
// submit_vote SQL validation + 6h device rate limit remain authoritative/secondary.
// Never logs token/alloc/clientId; never returns raw database errors.
import { createClient } from "@supabase/supabase-js";
import { verifyTurnstile, parseHostnames } from "../_shared/turnstile.ts";
import { corsHeaders, preflightHeaders, isAllowedOrigin, parseAllowedOrigins } from "../_shared/cors.ts";
import { json } from "../_shared/respond.ts";
import { readValidatedBody, validateToken, validateBudgetFields } from "../_shared/validate.ts";
import { US_STATES } from "../_shared/usStates.ts";

const ALLOWED_ORIGINS = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
// 16 KB. Evidence: a worst-case legitimate payload — a max-length (2048-char) token
// plus a complete allocation across all 36 categories in 3 tiers — measures ≈2.71 KB,
// so 16 KB leaves ~6× headroom and never truncates a valid submission.
const MAX_BODY_BYTES = 16 * 1024;
// Income-range indices come from INCOME_RANGES (src/data/taxConstants.js): 8 ranges → 0..7.
const BRACKET_MAX = 7;
const ALLOWED_FIELDS = ["token", "clientId", "region", "bracket", "filing", "alloc"];
const REQUIRED_FIELDS = ["token", "clientId", "alloc"];

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin, ALLOWED_ORIGINS);

  // 1. origin (+ preflight)
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: preflightHeaders(origin, ALLOWED_ORIGINS) });
  if (!isAllowedOrigin(origin, ALLOWED_ORIGINS)) return json({ error: "forbidden_origin" }, 403, cors);

  // 2–6. method → content-type → size → parse → shape (allow-listed + required fields)
  const v = await readValidatedBody(req, {
    maxBytes: MAX_BODY_BYTES,
    allowed: ALLOWED_FIELDS,
    required: REQUIRED_FIELDS,
  });
  if (!v.ok) return json({ error: v.error }, v.status, cors);
  const body = v.body;

  // 6b. field formats (§5): clientId UUID, region (US state name), bracket 0..7,
  // filing single|mfj|hoh, alloc object. Runs BEFORE token/Siteverify so invalid
  // fields never reach Cloudflare or the database.
  const f = validateBudgetFields(body, { states: US_STATES, bracketMax: BRACKET_MAX });
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

  // 9. database RPC (submit_vote remains authoritative for allocation rules).
  // Fields are already validated above; alloc detail is enforced server-side.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase.rpc("submit_vote", {
    p_client_id: body.clientId as string,
    p_region: body.region as string,
    p_bracket: body.bracket as number,
    p_filing: body.filing as string,
    p_alloc: body.alloc,
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("rate_limited")) return json({ error: "rate_limited" }, 429, cors);
    if (msg.includes("invalid_allocation")) return json({ error: "invalid_allocation" }, 422, cors);
    return json({ error: "server_error" }, 500, cors); // never leak raw DB error text
  }
  return json({ ok: true }, 200, cors);
});
