// CORS restricted to an explicit allow-list from ALLOWED_ORIGINS (ANTI-ABUSE §8).
// Exact-origin matching only — no wildcard, no substring/suffix/prefix matching.
// Missing/empty ALLOWED_ORIGINS yields an empty list, so every origin is denied
// (fail closed). Production writes never use Access-Control-Allow-Origin: *.

// Parse ALLOWED_ORIGINS: split on comma, trim, ignore empties, DROP any entry
// containing "*" (wildcards are never accepted), and DEDUPLICATE. Values are
// compared exactly downstream.
export function parseAllowedOrigins(env: string | undefined | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const rawEntry of (env ?? "").split(",")) {
    const entry = rawEntry.trim();
    if (!entry) continue;              // ignore empty entries
    if (entry.includes("*")) continue; // never accept a wildcard
    if (seen.has(entry)) continue;     // deduplicate
    seen.add(entry);
    out.push(entry);
  }
  return out;
}

// Exact match against the allow-list (Array.includes is element-exact, so
// "https://approved.app.evil.com" or "https://evil-approved.app" never match).
export function isAllowedOrigin(origin: string | null, allowed: string[]): boolean {
  return !!origin && allowed.includes(origin);
}

// Headers for normal (non-preflight) responses. Access-Control-Allow-Origin is set
// ONLY for an exact approved origin; Vary: Origin is always present so caches key on
// it. Only the methods/headers the frontend actually uses are exposed.
export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const h: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
  if (isAllowedOrigin(origin, allowed)) h["Access-Control-Allow-Origin"] = origin as string;
  return h;
}

// Headers for an OPTIONS preflight. Same as corsHeaders, plus Access-Control-Max-Age
// for an approved origin only. A disallowed/missing origin gets NO Allow-Origin
// header (and no Max-Age), so the browser will not grant cross-origin access.
export function preflightHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const h = corsHeaders(origin, allowed);
  if (isAllowedOrigin(origin, allowed)) h["Access-Control-Max-Age"] = "86400";
  return h;
}
