// App-level configuration. SHARE_URL is the canonical production URL.
// Keep this in sync with the live deployment.
export const SHARE_URL = "https://peoples-budget.vercel.app";

// Below this participant count, community results are shown as preliminary.
export const LOW_N_THRESHOLD = 25;

// Anti-abuse (ANTI-ABUSE-v2.8). OFF by default. When enabled, budget submissions
// and event responses are routed through the Turnstile-protected Edge Function
// gateway instead of calling the write RPCs directly. No secret lives here — only
// the PUBLIC site key and a boolean, both from the environment.
export const TURNSTILE_ENABLED = import.meta.env.VITE_TURNSTILE_ENABLED === "true";
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
// Supabase Edge Functions base, derived from the project URL (no extra config).
export const FUNCTIONS_URL =
  (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "") + "/functions/v1";
