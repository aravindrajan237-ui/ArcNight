import { handle, ok, fail, parseBody, requireUser, ApiError } from "@/lib/api";
import { createReviewSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

// Reads live data per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * GET /api/reviews?user=<id> — public reviews ABOUT a user (reviewee), newest
 * first, each enriched with the reviewer's name + photo.
 */
export const GET = handle(async (req) => {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("user");
  if (!userId) return fail(400, "`user` query param is required");

  const admin = createAdminClient();
  const { data: reviews, error } = await admin
    .from("reviews")
    .select("*")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const reviewerIds = [...new Set((reviews ?? []).map((r) => r.reviewer_id))];
  const { data: profiles } = reviewerIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", reviewerIds)
    : { data: [] as { id: string; full_name: string | null; photo_url: string | null }[] };

  const enriched = (reviews ?? []).map((r) => {
    const p = profiles?.find((x) => x.id === r.reviewer_id);
    return {
      ...r,
      reviewer_name: p?.full_name ?? "Anonymous",
      reviewer_photo: p?.photo_url ?? null,
    };
  });

  const count = enriched.length;
  const avg = count
    ? +(enriched.reduce((s, r) => s + Number(r.rating), 0) / count).toFixed(1)
    : 0;

  return ok({ reviews: enriched, count, average: avg });
});

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
