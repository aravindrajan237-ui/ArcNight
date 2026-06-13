import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemo, demoUserId, demoRole } from "@/lib/demo-auth";
import type { Profile, Role } from "@/lib/types";

/**
 * Small toolkit shared by every route handler: consistent JSON envelopes, zod
 * body parsing, and auth/role guards. Throws `ApiError` for control flow; the
 * `handle` wrapper converts those + zod errors into proper HTTP responses.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/** Parse + validate a JSON body against a zod schema, or throw ApiError(400). */
export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  return schema.parse(json);
}

/** Require an authenticated user; returns the user + their profile. */
export async function requireUser() {
  // ⚠️ TEMPORARY demo bypass — admin client (RLS-free) acting as the demo user.
  if (isDemo()) {
    const supabase = createAdminClient();
    const id = demoUserId();
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    return { supabase, user: { id }, profile: (profile ?? null) as Profile | null };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { supabase, user, profile: (profile ?? null) as Profile | null };
}

/** Require an authenticated user whose profile.role matches. */
export async function requireRole(role: Role) {
  const ctx = await requireUser();
  if (!ctx.profile?.role) throw new ApiError(403, "Complete onboarding first");
  if (ctx.profile.role !== role) {
    throw new ApiError(403, `Only ${role}s can perform this action`);
  }
  return ctx;
}

/**
 * Wrap a handler so thrown ApiError / ZodError become clean JSON responses.
 * Usage: export const POST = handle(async (req) => { ... return ok(x); });
 */
export function handle(
  fn: (req: Request, ctx: { params: Record<string, string> }) => Promise<Response>,
) {
  return async (req: Request, ctx: { params: Record<string, string> }) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, err.message);
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", issues: err.flatten() },
          { status: 422 },
        );
      }
      console.error("[api] unhandled error:", err);
      return fail(500, "Internal server error");
    }
  };
}
