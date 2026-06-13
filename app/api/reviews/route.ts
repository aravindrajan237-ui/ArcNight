import { handle, ok, parseBody, requireUser, ApiError } from "@/lib/api";
import { createReviewSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/reviews — leave a review after a fulfilled deal.
 * The reviewer must be a party to the deal, the deal must be `fulfilled`, and
 * the reviewee is automatically the counterparty. One review per reviewer/deal.
 */
export const POST = handle(async (req) => {
  const { user } = await requireUser();
  const body = await parseBody(req, createReviewSchema);
  const admin = createAdminClient();

  const { data: deal, error } = await admin
    .from("deals")
    .select("id, farmer_id, buyer_id, status")
    .eq("id", body.deal_id)
    .single();

  if (error || !deal) throw new ApiError(404, "Deal not found");
  if (deal.status !== "fulfilled") {
    throw new ApiError(409, "You can only review a fulfilled deal");
  }

  const isFarmer = user.id === deal.farmer_id;
  const isBuyer = user.id === deal.buyer_id;
  if (!isFarmer && !isBuyer) {
    throw new ApiError(403, "You are not a party to this deal");
  }
  const revieweeId = isFarmer ? deal.buyer_id : deal.farmer_id;

  const { data: review, error: insErr } = await admin
    .from("reviews")
    .insert({
      deal_id: deal.id,
      reviewer_id: user.id,
      reviewee_id: revieweeId,
      rating: body.rating,
      comment: body.comment ?? null,
    })
    .select("*")
    .single();

  if (insErr) {
    // Unique (deal_id, reviewer_id) violation → already reviewed.
    if (insErr.code === "23505") {
      throw new ApiError(409, "You already reviewed this deal");
    }
    throw new Error(insErr.message);
  }

  return ok(review, 201);
});
