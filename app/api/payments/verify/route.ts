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

  // The order must belong to a pending advance payment on this deal.
  const { data: payment } = await admin
    .from("payments")
    .select("id, status")
    .eq("deal_id", deal.id)
    .eq("type", "advance")
    .eq("provider_order_id", body.razorpay_order_id)
    .maybeSingle();
  if (!payment) throw new ApiError(400, "No matching advance order for this deal");

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

  // 2) Mark payment + deal paid; reflect on the listing.
  await admin
    .from("payments")
    .update({ status: "paid", provider_payment_id: body.razorpay_payment_id })
    .eq("id", payment.id);

  const { data: updated, error: updErr } = await admin
    .from("deals")
    .update({ advance_paid: true, status: "advance_paid" })
    .eq("id", deal.id)
    .select("*")
    .single();
  if (updErr) throw new Error(updErr.message);

  await admin
    .from("harvest_listings")
    .update({ status: "paid" })
    .eq("id", deal.listing_id);

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
