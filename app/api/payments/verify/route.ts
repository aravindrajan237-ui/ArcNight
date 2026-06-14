import { handle, ok, parseBody, requireUser, ApiError } from "@/lib/api";
import { paymentVerifySchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { buildAndUploadAgreement } from "@/lib/agreement";

// Verifies a signature per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/verify — verify the Razorpay signature for the advance,
 * mark the payment + deal paid, and ensure the agreement PDF exists.
 *
 * The PDF step is best-effort: failures are logged but never block a
 * successfully verified payment.
 */
export const POST = handle(async (req) => {
  const { user } = await requireUser();
  const body = await parseBody(req, paymentVerifySchema);
  const admin = createAdminClient();

  const { data: deal, error } = await admin
    .from("deals")
    .select("*")
    .eq("id", body.deal_id)
    .single();

  if (error || !deal) throw new ApiError(404, "Deal not found");
  if (deal.buyer_id !== user.id) {
    throw new ApiError(403, "Only the buyer can verify this payment");
  }

  // Match the pending payment for this order (advance OR final balance).
  const { data: payment } = await admin
    .from("payments")
    .select("id, status, type")
    .eq("deal_id", deal.id)
    .eq("provider_order_id", body.razorpay_order_id)
    .maybeSingle();
  if (!payment) throw new ApiError(400, "No matching order for this deal");
  const isFinal = payment.type === "final";

  // 1) Verify the HMAC signature.
  const valid = verifyPaymentSignature({
    orderId: body.razorpay_order_id,
    paymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
  });
  if (!valid) {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    throw new ApiError(400, "Invalid payment signature");
  }

  // 2) Mark the payment paid.
  await admin
    .from("payments")
    .update({ status: "paid", provider_payment_id: body.razorpay_payment_id })
    .eq("id", payment.id);

  // 3) Advance the deal: advance -> advance_paid; final balance -> fulfilled.
  const dealUpdate = isFinal
    ? { status: "fulfilled" as const }
    : { advance_paid: true, status: "advance_paid" as const };
  const { data: updated, error: updErr } = await admin
    .from("deals")
    .update(dealUpdate)
    .eq("id", deal.id)
    .select("*")
    .single();
  if (updErr) throw new Error(updErr.message);

  if (!isFinal) {
    // ADVANCE: decrement the listing's available quantity by what was bought. If
    // stock remains, the listing stays OPEN and listed (so other buyers can buy
    // the rest); when it's fully sold we mark it paid. NOTE: the schema enforces
    // `quantity_kg > 0`, so on a full sell-out we only flip the status (writing 0
    // would violate the constraint and silently leave the listing available).
    const boughtQty = Number(deal.final_qty_kg ?? 0);
    const { data: listingRow } = await admin
      .from("harvest_listings")
      .select("quantity_kg")
      .eq("id", deal.listing_id)
      .single();
    const remaining = Math.max(
      0,
      +(Number(listingRow?.quantity_kg ?? 0) - boughtQty).toFixed(2),
    );
    const listingUpdate: { status: "open" | "paid"; quantity_kg?: number } =
      remaining > 0
        ? { quantity_kg: remaining, status: "open" }
        : { status: "paid" };
    const { error: decErr } = await admin
      .from("harvest_listings")
      .update(listingUpdate)
      .eq("id", deal.listing_id);
    if (decErr) {
      console.error("[payments/verify] stock update failed:", decErr.message);
    }
  } else {
    // FINAL: the order is complete — credit the farmer with a completed deal.
    // We do NOT touch the listing's status here: a partially-sold listing may
    // still have stock available for other buyers. Best-effort; never blocks
    // the payment.
    try {
      const { data: fp } = await admin
        .from("profiles")
        .select("completed_deals")
        .eq("id", deal.farmer_id)
        .single();
      await admin
        .from("profiles")
        .update({ completed_deals: Number(fp?.completed_deals ?? 0) + 1 })
        .eq("id", deal.farmer_id);
    } catch (err) {
      console.error("[payments/verify] farmer credit failed:", err);
    }
  }

  // 3) Ensure the agreement PDF exists (regenerate if it's somehow missing).
  //    Wrapped so a Storage hiccup never crashes an already-verified payment.
  let agreementUrl = updated.agreement_pdf_url;
  if (!agreementUrl) {
    try {
      agreementUrl = await buildAndUploadAgreement(admin, deal.id);
    } catch (err) {
      console.error("[payments] PDF generation failed, proceeding without it:", err);
      agreementUrl = null;
    }
  }

  return ok({
    verified: true,
    deal: updated,
    agreement_pdf_url: agreementUrl,
  });
});
