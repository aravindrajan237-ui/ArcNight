import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemo, demoUserId } from "@/lib/demo-auth";
import type { Profile } from "@/lib/types";

/**
 * Server-component auth helper. Returns the signed-in user + their profile, or
 * redirects to /login. Middleware already gates /farmer/* and /buyer/* by role;
 * this just loads the data the page needs.
 */
export async function getMe() {
  // ⚠️ TEMPORARY demo bypass — act as the demo farmer/buyer (real DB rows).
  if (isDemo()) {
    const admin = createAdminClient();
    const id = demoUserId();
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    return { supabase: admin, user: { id }, profile: (profile ?? null) as Profile | null };
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile: (profile ?? null) as Profile | null };
}

/** First name for greetings. */
export function firstName(profile: Profile | null): string {
  return profile?.full_name?.trim().split(/\s+/)[0] ?? "there";
}

/** Time-of-day greeting. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
