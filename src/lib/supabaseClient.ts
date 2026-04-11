import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * True when both Vite env vars are set (trimmed non-empty).
 * Use to avoid calling Supabase before configuration exists (e.g. CI build artifact opened without env).
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return typeof url === "string" && url.trim().length > 0 && typeof key === "string" && key.trim().length > 0;
}

let browserClient: SupabaseClient | null = null;

/**
 * Singleton browser Supabase client. Call only when `isSupabaseConfigured()` is true.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example).",
    );
  }
  if (!browserClient) {
    browserClient = createClient(
      import.meta.env.VITE_SUPABASE_URL!.trim(),
      import.meta.env.VITE_SUPABASE_ANON_KEY!.trim(),
    );
  }
  return browserClient;
}
