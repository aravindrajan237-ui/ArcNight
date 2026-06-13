import { handle, ok, parseBody, requireUser, ApiError } from "@/lib/api";
import { paymentOrderSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAdvanceOrder } from "@/lib/razorpay";

// Calls Razorpay per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/order — create a Razorpay TEST order for the 15% advance.
 *
 * Only the buyer on the deal may pay. Creates the order, records a `payments`
 * row (type 'advance', status 'created') with the Razorpay order id, and
 * returns the order + public key id so the client can open Razorpay Checkout.
 *
 * Env keys: NEXT_PUBLIC_RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET.
 */
export const POST = handle(async (req) => {
  const { user } = await requireUser();
  const { deal_id } = await parseBody(req, paymentOrderSchema);
  const admin = createAdminClient();

  const { data: deal, error } = await admin
    .from("deals")
    .select("id, buyer_id, advance_amount, advance_paid, status")
    .eq("id", deal_id)
    .single();

  if (error || !deal) throw new ApiError(404, "Deal not found");
  if (deal.buyer_id !== user.id) {
    throw new ApiError(403, "Only the buyer can pay the advance");
  }
  if (deal.advance_paid) throw new ApiError(409, "Advance already paid");

  const order = await createAdvanceOrder({
    amountInr: Number(deal.advance_amount),
    dealId: deal.id,
  });

  // Record the pending advance payment so /verify can cross-check the order id.
  const { error: payErr } = await admin.from("payments").insert({
    deal_id: deal.id,
    payer_id: user.id,
    amount: Number(deal.advance_amount),
    type: "advance",
    provider: "razorpay",
    provider_order_id: order.id,
    status: "created",
  });
  if (payErr) throw new Error(payErr.message);

  return ok({
    order_id: order.id,
    amount: order.amount, // paise
    currency: order.currency,
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    deal_id: deal.id,
  });
});
