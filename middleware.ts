import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Root middleware:
 *  1. Refreshes the Supabase session cookie on every request.
 *  2. Protects /farmer/* and /buyer/* by authentication AND role.
 *
 * Role is read from the `profiles` table for the logged-in user. Users without
 * a role yet are bounced to /onboarding.
 */
export async function middleware(request: NextRequest) {
  // ⚠️ TEMPORARY demo bypass — skip auth/role gating so the app is testable.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return NextResponse.next();
  }

  const { response, supabase, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isFarmerArea = pathname.startsWith("/farmer");
  const isBuyerArea = pathname.startsWith("/buyer");
  if (!isFarmerArea && !isBuyerArea) return response;

  // Not logged in → login.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Resolve role.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // No role yet → finish onboarding.
  if (!profile?.role) {
    const url = request.nextUrl.clone();
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // Wrong area for this role → send to their own dashboard.
  if (isFarmerArea && profile.role !== "farmer") {
    const url = request.nextUrl.clone();
    url.pathname = "/buyer";
    return NextResponse.redirect(url);
  }
  if (isBuyerArea && profile.role !== "buyer") {
    const url = request.nextUrl.clone();
    url.pathname = "/farmer";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Run on everything except static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
