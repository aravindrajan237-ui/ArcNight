import { handle, ok, parseBody, requireRole, ApiError } from "@/lib/api";
import { respondOfferSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/offers/[id]/respond — farmer accepts / rejects / counters an offer
 * on one of their listings. Farmer only, and must own the parent listing.
 *
 *  - accept:  offer.status = accepted (a deal can now be created from it)
 *  - reject:  offer.status = rejected
 *  - counter: original offer.status = countered; a new offer row (from the
 *             farmer's terms, still attributed to the buyer) is created with
 *             parent_offer_id pointing back, keeping the negotiation thread.
 */
export const POST = handle(async (req, { params }) => {
  const { user } = await requireRole("farmer");
  const body = await parseBody(req, respondOfferSchema);

  const admin = createAdminClient();

  // Load the offer, then its listing, to verify ownership.
  const { data: offer, error: offerErr } = await admin
    .from("offers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (offerErr || !offer) throw new ApiError(404, "Offer not found");

  const { data: listing, error: listingErr } = await admin
    .from("listings")
    .select("farmer_id")
    .eq("id", offer.listing_id)
    .single();
  if (listingErr || !listing) throw new ApiError(404, "Listing not found");
  if (listing.farmer_id !== user.id) {
    throw new ApiError(403, "You can only respond to offers on your listings");
  }
  if (offer.status !== "pending") {
    throw new ApiError(409, `Offer is already ${offer.status}`);
  }

  if (body.action === "accept") {
    const { data, error } = await admin
      .from("offers")
      .update({ status: "accepted" })
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return ok({ action: "accept", offer: data });
  }

  if (body.action === "reject") {
    const { data, error } = await admin
      .from("offers")
      .update({ status: "rejected" })
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // If no other pending offers remain, reopen the listing.
    await admin
      .from("listings")
      .update({ status: "open" })
      .eq("id", offer.listing_id);

    return ok({ action: "reject", offer: data });
  }

  // counter
  await admin.from("offers").update({ status: "countered" }).eq("id", params.id);
  const { data: counter, error } = await admin
    .from("offers")
    .insert({
      listing_id: offer.listing_id,
      buyer_id: offer.buyer_id,
      offer_price_per_kg: body.counter_price_per_kg!,
      quantity_kg: body.counter_quantity_kg ?? offer.quantity_kg,
      message: body.message ?? null,
      parent_offer_id: params.id,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return ok({ action: "counter", offer: counter }, 201);
});
