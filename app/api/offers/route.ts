import { handle, ok, parseBody, requireRole, ApiError } from "@/lib/api";
import { createOfferSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

// Inserts per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/offers — a buyer makes an offer on a harvest contract (buyer only).
 * Derives the farmer from the listing. The listing must be open.
 */
export const POST = handle(async (req) => {
  const { user } = await requireRole("buyer");
  const body = await parseBody(req, createOfferSchema);
  const admin = createAdminClient();

  const { data: listing, error: listingErr } = await admin
    .from("harvest_listings")
    .select("id, farmer_id, status")
    .eq("id", body.listing_id)
    .single();

  if (listingErr || !listing) throw new ApiError(404, "Listing not found");
  if (listing.status !== "open") {
    throw new ApiError(409, "This harvest is no longer open for offers");
  }
  if (listing.farmer_id === user.id) {
    throw new ApiError(403, "You cannot make an offer on your own listing");
  }

  const { data: offer, error } = await admin
    .from("offers")
    .insert({
      listing_id: body.listing_id,
      buyer_id: user.id,
      farmer_id: listing.farmer_id,
      proposed_price: body.proposed_price,
      proposed_qty_kg: body.proposed_qty_kg,
      message: body.message ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw new ApiError(400, error.message);
  return ok(offer, 201);
});
