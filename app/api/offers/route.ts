import { handle, ok, parseBody, requireRole, ApiError } from "@/lib/api";
import { createOfferSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/offers — a buyer makes (or counters) an offer on a listing.
 * Buyer only. Marks the listing as `in_negotiation`.
 */
export const POST = handle(async (req) => {
  const { user } = await requireRole("buyer");
  const body = await parseBody(req, createOfferSchema);

  const admin = createAdminClient();

  // Listing must exist and be open for offers.
  const { data: listing, error: listingErr } = await admin
    .from("listings")
    .select("id, farmer_id, status")
    .eq("id", body.listing_id)
    .single();

  if (listingErr || !listing) throw new ApiError(404, "Listing not found");
  if (listing.status === "closed") {
    throw new ApiError(409, "This listing is closed");
  }
  if (listing.farmer_id === user.id) {
    throw new ApiError(403, "You cannot make an offer on your own listing");
  }

  const { data: offer, error } = await admin
    .from("offers")
    .insert({
      listing_id: body.listing_id,
      buyer_id: user.id,
      offer_price_per_kg: body.offer_price_per_kg,
      quantity_kg: body.quantity_kg,
      message: body.message ?? null,
      parent_offer_id: body.parent_offer_id ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await admin
    .from("listings")
    .update({ status: "in_negotiation" })
    .eq("id", body.listing_id);

  return ok(offer, 201);
});
