import { createClient } from "@supabase/supabase-js";

// Vite exposes env vars prefixed with VITE_ to the browser.
// The anon key is SAFE to ship in the client — Row Level Security + the
// SECURITY DEFINER functions in the schema are what actually protect data.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Resilience: a missing/misconfigured env must NOT crash the whole app at module
// load (which would render a blank white screen). We surface a flag the UI can
// show, and fall back to harmless placeholders so the SPA still renders — backend
// calls then fail as normal, already-handled errors rather than a blank page.
export const configError = !url || !anonKey;
if (configError) {
  console.error(
    "Supabase config missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the " +
    "environment and redeploy. The app will load, but submissions and public results are unavailable."
  );
}

export const supabase = createClient(
  url || "https://placeholder.invalid",
  anonKey || "placeholder-anon-key",
  { auth: { persistSession: false } } // anonymous app — no login needed
);
