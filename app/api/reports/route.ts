import { handle, ok, parseBody, requireUser, ApiError } from "@/lib/api";
import { createReportSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

// Inserts per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/reports — file a scam/abuse report (#3). Stored for admin review.
 * Any authenticated user can report another user, a listing, or a deal.
 */
export const POST = handle(async (req) => {
  const { user } = await requireUser();
  const body = await parseBody(req, createReportSchema);

  if (body.reported_user_id === user.id) {
    throw new ApiError(400, "You can't report yourself");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reports")
    .insert({
      reporter_id: user.id,
      reported_user_id: body.reported_user_id ?? null,
      listing_id: body.listing_id ?? null,
      deal_id: body.deal_id ?? null,
      reason: body.reason,
      description: body.description ?? null,
      status: "open",
    })
    .select("id")
    .single();

  if (error) throw new ApiError(400, error.message);
  return ok({ id: data.id, received: true }, 201);
});
