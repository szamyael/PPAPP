import { createClient } from "@supabase/supabase-js";

// Load from env — Vite exposes VITE_* vars to the browser bundle.
// The anon key is intentionally public; it only enables the Row Level
// Security layer, never bypasses it.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const isMissingEnv = (v: unknown) => {
  if (typeof v !== "string") return true;
  const t = v.trim();
  return !t || t === "undefined" || t === "null";
};

if (isMissingEnv(supabaseUrl) || isMissingEnv(supabaseAnonKey)) {
  throw new Error(
    "[Piyupair] Missing Supabase env vars. " +
    "Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
