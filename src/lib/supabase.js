import { createClient } from "@supabase/supabase-js";

// Vite exposes env vars prefixed with VITE_ to the browser.
// The anon key is SAFE to ship in the client — Row Level Security + the
// SECURITY DEFINER functions in the schema are what actually protect data.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Helpful during setup — remove or keep, your call.
  console.warn("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env");
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false }, // anonymous app — no login needed
});
