import Razorpay from "razorpay";
import crypto from "node:crypto";

/**
 * Razorpay TEST-mode helpers. Server-only (uses the secret).
 * The public key id (NEXT_PUBLIC_RAZORPAY_KEY_ID) is sent to the browser to
 * open the checkout widget; the secret stays here for order creation + verify.
 */

export function getRazorpay() {
  return new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
    key_secret: process.env.RAZORPAY_KEY_SECRET ?? "",
  });
}

/**
 * Create a TEST order. Amount is in paise (₹1 = 100 paise), so we round the
 * rupee amount and multiply by 100. `kind` distinguishes the 15% advance from
 * the remaining balance ("final") so both receipts stay unique + ≤40 chars.
 */
export async function createAdvanceOrder(params: {
  amountInr: number;
  dealId: string;
  kind?: "advance" | "final";
}) {
  const razorpay = getRazorpay();
  const isFinal = params.kind === "final";
  return razorpay.orders.create({
    amount: Math.round(params.amountInr * 100),
    currency: "INR",
    // Razorpay caps receipt at 40 chars; a bare UUID is 36, "f_" + UUID is 38.
    receipt: isFinal ? `f_${params.dealId}` : params.dealId,
    notes: {
      deal_id: params.dealId,
      purpose: isFinal ? "balance_85pct" : "advance_15pct",
    },
  });
}

/**
 * Verify the checkout signature: HMAC_SHA256(order_id|payment_id, secret).
 * Constant-time comparison to avoid timing leaks.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "")
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
