import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client, created lazily and reused.
 *
 * Returns `null` when the env vars are absent rather than throwing, because
 * MasterPrompt §12 requires every external service to degrade instead of
 * breaking a screen: with no client, `provider.ts` falls back to the seeded
 * demo user and the login screen still works.
 *
 * The anon key is public by design — it ships in the browser bundle for every
 * Supabase app. Row Level Security on each table is the security boundary, not
 * this key, which is why §2's "no secrets in client components" rule is not
 * violated here. Never expose the service_role key this way.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;

  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The OAuth code lands back on /login; picking it up automatically is
        // what completes the Google round trip.
        detectSessionInUrl: true,
        // PKCE keeps the code_verifier in THIS browser. The FastAPI
        // /auth/google route cannot work precisely because it generates the
        // verifier server-side, where the browser can never reach it.
        flowType: "pkce",
      },
    });
  }

  return cached;
}
