// Shared, cheap request validation performed BEFORE any Cloudflare Siteverify call
// (ANTI-ABUSE-v2.8.1 §4). Enforces the transport-level gate — method, content-type,
// bounded body read, JSON parse, allow-listed fields, required-field presence, and
// Turnstile token presence/length — so obviously-malformed requests never reach
// Cloudflare or the database. Field-FORMAT checks (UUID, region, bracket, filing,
// choice, eventId) are added per-endpoint in §5/§6. This module never logs anything.

export const MAX_TOKEN_LEN = 2048;

export type Fail = { ok: false; error: string; status: number };
export type BodyOk = { ok: true; body: Record<string, unknown> };
export type TokenOk = { ok: true; token: string };

// Reads at most maxBytes from the request body WITHOUT buffering more than that,
// even when Content-Length is missing or understated. Returns null if the limit is
// exceeded (so the caller rejects before parsing JSON).
async function readBounded(req: Request, maxBytes: number): Promise<string | null> {
  const clen = req.headers.get("content-length");
  if (clen && Number(clen) > maxBytes) return null;
  if (!req.body) {
    const t = await req.text();
    return t.length > maxBytes ? null : t;
  }
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      if (received > maxBytes) {
        try { await reader.cancel(); } catch { /* ignore */ }
        return null;
      }
      chunks.push(value);
    }
  }
  const buf = new Uint8Array(received);
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.byteLength; }
  return new TextDecoder().decode(buf);
}

// Steps 2–6 of the required order: method → content-type → size → parse → shape
// (allow-listed + required fields). Origin (step 1) is checked by the caller because
// it needs the CORS allow-list; token (step 7), Siteverify (8) and the RPC (9) follow.
export async function readValidatedBody(
  req: Request,
  opts: { maxBytes: number; allowed: string[]; required: string[] },
): Promise<Fail | BodyOk> {
  // 2. method
  if (req.method !== "POST") return { ok: false, error: "bad_request", status: 405 };
  // 3. content-type
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (!ct.includes("application/json")) return { ok: false, error: "unsupported_media_type", status: 415 };
  // 4. size limit — enforced before req.json()
  const raw = await readBounded(req, opts.maxBytes);
  if (raw === null) return { ok: false, error: "payload_too_large", status: 413 };
  // 5. parse JSON
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { ok: false, error: "bad_request", status: 400 }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "bad_request", status: 400 };
  }
  const body = parsed as Record<string, unknown>;
  // 6. shape: reject unexpected fields, then require the mandatory ones
  for (const k of Object.keys(body)) {
    if (!opts.allowed.includes(k)) return { ok: false, error: "bad_request", status: 400 };
  }
  for (const k of opts.required) {
    if (!(k in body)) return { ok: false, error: "bad_request", status: 400 };
  }
  return { ok: true, body };
}

// 7. token presence + length — no network call. A missing, empty, non-string, or
// over-length token is rejected here so Cloudflare is never called for it.
export function validateToken(token: unknown): TokenOk | Fail {
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, error: "turnstile_missing", status: 400 };
  }
  if (token.length > MAX_TOKEN_LEN) {
    return { ok: false, error: "turnstile_missing", status: 400 };
  }
  return { ok: true, token };
}

// ── Field-format validators (§5/§6) ─────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
export function isInteger(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v);
}

// §5 — submit-budget field formats. The app ALWAYS sends a full US state NAME,
// an income-range index 0..bracketMax, and a filing of single|mfj|hoh (never null),
// so null/omitted values are treated as invalid. submit_vote remains authoritative
// for the detailed allocation rules — alloc is only shape-checked here.
export function validateBudgetFields(
  body: Record<string, unknown>,
  opts: { states: Set<string>; bracketMax: number },
): Fail | { ok: true } {
  if (!isUuid(body.clientId)) return { ok: false, error: "invalid_client_id", status: 400 };
  if (typeof body.region !== "string" || !opts.states.has(body.region)) {
    return { ok: false, error: "invalid_region", status: 400 };
  }
  if (!isInteger(body.bracket) || (body.bracket as number) < 0 || (body.bracket as number) > opts.bracketMax) {
    return { ok: false, error: "invalid_bracket", status: 400 };
  }
  if (body.filing !== "single" && body.filing !== "mfj" && body.filing !== "hoh") {
    return { ok: false, error: "invalid_filing", status: 400 };
  }
  if (!body.alloc || typeof body.alloc !== "object" || Array.isArray(body.alloc)) {
    return { ok: false, error: "bad_request", status: 400 };
  }
  return { ok: true };
}

// §6 — submit-event-response field formats. eventId format mirrors the DB/admin
// rule ^[a-z0-9_-]{1,64}$ (0003_admin_hardening.sql), which also bounds length ≤64.
// choice mirrors the event_responses CHECK constraint. clientId is a UUID.
const EVENT_ID_RE = /^[a-z0-9_-]{1,64}$/;
export function validateEventFields(body: Record<string, unknown>): Fail | { ok: true } {
  if (!isUuid(body.clientId)) return { ok: false, error: "invalid_client_id", status: 400 };
  if (typeof body.eventId !== "string" || !EVENT_ID_RE.test(body.eventId)) {
    return { ok: false, error: "invalid_event_id", status: 400 };
  }
  if (body.choice !== "increase" && body.choice !== "same" && body.choice !== "decrease") {
    return { ok: false, error: "invalid_choice", status: 400 };
  }
  return { ok: true };
}
