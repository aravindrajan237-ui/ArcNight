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
  const { deal_id, kind } = await parseBody(req, paymentOrderSchema);
  const admin = createAdminClient();

  const { data: deal, error } = await admin
    .from("deals")
    .select("id, buyer_id, total_amount, advance_amount, advance_paid, status")
    .eq("id", deal_id)
    .single();

  if (error || !deal) throw new ApiError(404, "Deal not found");
  if (deal.buyer_id !== user.id) {
    throw new ApiError(403, "Only the buyer can pay for this order");
  }

  // Decide the amount + guards for this payment stage.
  let amountInr: number;
  if (kind === "final") {
    if (!deal.advance_paid) {
      throw new ApiError(409, "Pay the advance before the balance.");
    }
    if (deal.status === "fulfilled") {
      throw new ApiError(409, "This order is already paid in full.");
    }
    amountInr = +(Number(deal.total_amount) - Number(deal.advance_amount)).toFixed(2);
  } else {
    if (deal.advance_paid) throw new ApiError(409, "Advance already paid");
    amountInr = Number(deal.advance_amount);
  }

  // Razorpay rejects amounts under ₹1 (100 paise).
  if (!Number.isFinite(amountInr) || amountInr < 1) {
    throw new ApiError(400, "Amount is too small to process.");
  }

  let order;
  try {
    order = await createAdvanceOrder({ amountInr, dealId: deal.id, kind });
  } catch (err) {
    // Surface a clean gateway error instead of an unhandled 500.
    const desc =
      (err as { error?: { description?: string } })?.error?.description ??
      (err as Error)?.message ??
      "Payment gateway error";
    console.error("[payments/order] razorpay failed:", err);
    throw new ApiError(502, `Could not start payment: ${desc}`);
  }

  // Record the pending payment so /verify can cross-check the order id + type.
  const { error: payErr } = await admin.from("payments").insert({
    deal_id: deal.id,
    payer_id: user.id,
    amount: amountInr,
    type: kind,
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
