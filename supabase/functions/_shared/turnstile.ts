// Shared Cloudflare Turnstile server-side verification — FAIL CLOSED (ANTI-ABUSE
// v2.8 / v2.8.1 §7). Only an explicit { success: true } (and, when configured, a
// matching hostname) passes. Missing/empty/over-length token, missing secret,
// timeout, network error, non-200, malformed JSON, malformed response shape, and
// success !== true all reject. Never logs the token or secret; never surfaces
// Cloudflare error-codes to the browser — the gateways map the stable reason below.
//
// Pure module: `fetchImpl` and `expectedHostnames` are injected, so it is fully
// unit-testable with a mocked Siteverify and never reads the environment itself.
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 10_000; // short timeout; unreachable Siteverify fails closed
const MAX_TOKEN_LEN = 2048;

export type VerifyReason = "success" | "missing" | "failed" | "unavailable";
export interface VerifyResult { ok: boolean; reason: VerifyReason; }

export interface VerifyOptions {
  fetchImpl?: typeof fetch;
  // When nonempty, the Siteverify response hostname must exactly match one entry.
  expectedHostnames?: string[];
}

// Parse TURNSTILE_EXPECTED_HOSTNAMES: comma-separated, trimmed, empty entries
// ignored, exact-match only (no wildcards). Returns [] when unset → hostname
// validation is DISABLED (documented; not implied to be active).
export function parseHostnames(env: string | undefined | null): string[] {
  return (env ?? "").split(",").map((h) => h.trim()).filter((h) => h.length > 0);
}

export async function verifyTurnstile(
  token: unknown,
  secret: string,
  opts: VerifyOptions = {},
): Promise<VerifyResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const expected = opts.expectedHostnames ?? [];

  // 1–3. Token presence + length — NO network call for missing/empty/over-length.
  if (typeof token !== "string" || token.length === 0) return { ok: false, reason: "missing" };
  if (token.length > MAX_TOKEN_LEN) return { ok: false, reason: "missing" };
  // 4. Missing secret (misconfig) → fail closed, no network.
  if (!secret) return { ok: false, reason: "unavailable" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      signal: controller.signal,
    });
    // 7. non-200 → fail closed
    if (!res.ok) return { ok: false, reason: "unavailable" };
    // 8. malformed JSON → fail closed
    let data: unknown;
    try { data = await res.json(); } catch { return { ok: false, reason: "unavailable" }; }
    // 9. malformed response shape → fail closed (must be an object with boolean success)
    if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, reason: "unavailable" };
    const d = data as Record<string, unknown>;
    if (typeof d.success !== "boolean") return { ok: false, reason: "unavailable" };
    // 10/11. success !== true (invalid / expired / replayed token) → failed
    if (d.success !== true) return { ok: false, reason: "failed" };
    // Optional hostname enforcement (only when configured).
    if (expected.length > 0) {
      const host = d.hostname;
      // Required but absent/empty → can't confirm → fail closed (retryable).
      if (typeof host !== "string" || host.length === 0) return { ok: false, reason: "unavailable" };
      // Present but not allowed → definitive rejection.
      if (!expected.includes(host)) return { ok: false, reason: "failed" };
    }
    return { ok: true, reason: "success" };
  } catch {
    // 5/6. timeout / abort / network error → fail closed
    return { ok: false, reason: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}
