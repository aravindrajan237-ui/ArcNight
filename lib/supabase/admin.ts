import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

/**
 * Service-role ("admin") Supabase client.
 *
 * ⚠️  Bypasses Row Level Security. Use ONLY inside Route Handlers / server code
 * AFTER you have independently authenticated and authorized the caller. Never
 * import this into a Client Component — it would leak the service-role key.
 *
 * Typical use: writing audit rows, uploading the agreement PDF to Storage, or
 * cross-user reads (e.g. notifying the counterparty of a new offer).
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
