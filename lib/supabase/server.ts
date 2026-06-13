import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Server-side Supabase client for Server Components, Route Handlers and Server
 * Actions. Reads/writes the session from the request cookies and respects RLS
 * (acts AS the logged-in user). Use this for anything that should be scoped to
 * the authenticated user.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component. Safe to ignore when
            // session refresh is handled by middleware (see middleware.ts).
          }
        },
      },
    },
  );
}
