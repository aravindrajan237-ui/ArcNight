import { handle, ok, parseBody, requireUser, ApiError } from "@/lib/api";
import { createDealSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAndUploadAgreement } from "@/lib/agreement";

// Generates a PDF + touches Storage per request — never prerender.
export const dynamic = "force-dynamic";

const ADVANCE_RATE = 0.15; // 15% advance — the buyer's good-faith deposit toward
// their OWN total. This is NOT a platform fee. HarvestLink takes 0% commission.

/**
 * POST /api/deals — create a deal from an ACCEPTED offer.
 *
 * Either party may trigger it and must e-sign. Computes total + 15% advance +
 * balance, inserts the deal (status 'awaiting_advance'), reserves the listing,
 * then generates the digital agreement PDF and saves its URL. The advance is
 * collected later via /api/payments/order + /verify.
 */
export const POST = handle(async (req) => {
  const { user } = await requireUser();
  const body = await parseBody(req, createDealSchema);
  const admin = createAdminClient();

  // Load the accepted offer (migration-era columns).
  const { data: offer, error: offerErr } = await admin
    .from("offers")
    .select("id, listing_id, buyer_id, farmer_id, proposed_price, proposed_qty_kg, status")
    .eq("id", body.offer_id)
    .single();

  if (offerErr || !offer) throw new ApiError(404, "Offer not found");
  if (offer.status !== "accepted") {
    throw new ApiError(409, "Deal can only be created from an accepted offer");
  }

  const farmerId = offer.farmer_id;
  const buyerId = offer.buyer_id;

  // Caller must be a party to this offer.
  if (user.id !== farmerId && user.id !== buyerId) {
    throw new ApiError(403, "You are not a party to this offer");
  }

  const qty = Number(offer.proposed_qty_kg);
  const price = Number(offer.proposed_price);

  // Only one purchase can be IN PROGRESS at a time (an unpaid deal). Once it's
  // paid the stock decrements and the rest can be sold again.
  const { data: activeDeal } = await admin
    .from("deals")
    .select("id")
    .eq("listing_id", offer.listing_id)
    .eq("status", "awaiting_advance")
    .maybeSingle();
  if (activeDeal) {
    throw new ApiError(409, "This harvest already has a purchase in progress — please try again shortly.");
  }

  // The requested quantity must still be available (stock left after prior sales).
  const { data: stockRow } = await admin
    .from("harvest_listings")
    .select("quantity_kg, status")
    .eq("id", offer.listing_id)
    .single();
  const available = Number(stockRow?.quantity_kg ?? 0);
  if (stockRow?.status === "paid" || available <= 0) {
    throw new ApiError(409, "This harvest is sold out.");
  }
  if (qty > available) {
    throw new ApiError(409, `Only ${available} kg remain — please lower the quantity.`);
  }

  const total = +(qty * price).toFixed(2);
  const advance = +(total * ADVANCE_RATE).toFixed(2);

  // Insert the deal (status awaiting_advance) — service role bypasses RLS.
  const { data: deal, error: dealErr } = await admin
    .from("deals")
    .insert({
      listing_id: offer.listing_id,
      farmer_id: farmerId,
      buyer_id: buyerId,
      final_price: price,
      final_qty_kg: qty,
      total_amount: total,
      advance_amount: advance,
      advance_paid: false,
      status: "awaiting_advance",
    })
    .select("*")
    .single();

  if (dealErr || !deal) throw new Error(dealErr?.message ?? "Deal insert failed");

  // NOTE: we intentionally do NOT reserve/close the listing here. It stays open
  // and listed; the available quantity is decremented only when the advance is
  // paid (see /api/payments/verify), so any remaining stock stays purchasable.

  // Generate + upload the agreement PDF, save its URL (graceful: null on failure).
  const agreement_pdf_url = await buildAndUploadAgreement(admin, deal.id);

  return ok({ ...deal, agreement_pdf_url }, 201);
});
