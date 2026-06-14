import { handle, ok, parseBody, requireRole, ApiError } from "@/lib/api";
import { respondOfferSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";

// Mutates per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/offers/[id]/respond — farmer accepts / rejects / counters an offer
 * on one of their listings (farmer only, must own the listing).
 *
 *  - accept:  offer.status = accepted (a deal can be created from it)
 *  - reject:  offer.status = rejected
 *  - counter: this offer = countered; a new pending offer is created with the
 *             farmer's terms (migration `offers` has no parent link, so the
 *             thread is reconstructed by created_at order).
 */
export const POST = handle(async (req, { params }) => {
  const { user } = await requireRole("farmer");
  const body = await parseBody(req, respondOfferSchema);
  const admin = createAdminClient();

  const { data: offer, error: offerErr } = await admin
    .from("offers")
    .select("*")
    .eq("id", params.id)
    .single();

  if (offerErr || !offer) throw new ApiError(404, "Offer not found");
  if (offer.farmer_id !== user.id) {
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
    // The listing stays open — stock is only decremented when the advance is
    // paid, so any remaining quantity is still available to other buyers.
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
    return ok({ action: "reject", offer: data });
  }

  // counter
  await admin.from("offers").update({ status: "countered" }).eq("id", params.id);
  const { data: counter, error } = await admin
    .from("offers")
    .insert({
      listing_id: offer.listing_id,
      buyer_id: offer.buyer_id,
      farmer_id: offer.farmer_id,
      proposed_price: body.counter_price_per_kg!,
      proposed_qty_kg: body.counter_quantity_kg ?? offer.proposed_qty_kg,
      message: body.message ?? null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return ok({ action: "counter", offer: counter }, 201);
});
