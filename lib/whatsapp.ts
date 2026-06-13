import twilio from "twilio";

/**
 * Twilio WhatsApp helper (Sandbox).
 *
 * ── Sandbox join step (one-time, per recipient phone) ──────────────────────
 * 1. Twilio Console → Messaging → Try it out → Send a WhatsApp message.
 * 2. Note the sandbox number (default whatsapp:+14155238886) and the join code
 *    shown (e.g. "join velvet-tiger").
 * 3. From EACH recipient's WhatsApp (farmer + buyer), send that exact
 *    "join <code>" message to the sandbox number. Without this, Twilio will not
 *    deliver to that number while in sandbox mode.
 * 4. Put the sandbox number in TWILIO_WHATSAPP_FROM (incl. the "whatsapp:" prefix).
 *
 * Env keys used: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.
 *
 * Every failure here is logged and swallowed — a WhatsApp problem must NEVER
 * break the payment/deal flow.
 */

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

/** Normalize a raw phone (e.g. "9876543210") to a `whatsapp:+E164` address. */
function toWhatsApp(phone: string): string {
  if (phone.startsWith("whatsapp:")) return phone;
  const e164 = phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`;
  return `whatsapp:${e164}`;
}

/** Send one WhatsApp message. Returns true on success, false (logged) on any error. */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const client = getClient();
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!client || !from) {
    console.warn("[whatsapp] credentials missing — skipping send");
    return false;
  }
  try {
    await client.messages.create({ from, to: toWhatsApp(to), body });
    return true;
  } catch (err) {
    console.error("[whatsapp] send failed (non-fatal):", err);
    return false;
  }
}

/** Send the same message to several phones; never throws. */
export async function sendWhatsAppToMany(
  phones: (string | null | undefined)[],
  body: string,
): Promise<void> {
  await Promise.allSettled(
    phones.filter((p): p is string => !!p).map((p) => sendWhatsApp(p, body)),
  );
}

/**
 * Build the "Deal confirmed" receipt sent after a verified advance payment.
 * Mirrors the exact format the product spec specifies.
 */
export function dealConfirmedMessage(params: {
  crop: string;
  quantityKg: number;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  harvestDate: string;
  agreementUrl?: string | null;
}): string {
  const cropTitle =
    params.crop.charAt(0).toUpperCase() + params.crop.slice(1);
  return [
    "HarvestLink ✅ Deal confirmed",
    `Crop: ${cropTitle} ${params.quantityKg}kg | Final ₹${params.totalAmount} | Advance ₹${params.advanceAmount} | Balance ₹${params.balanceAmount} on delivery`,
    `Harvest: ${params.harvestDate} | Agreement: ${params.agreementUrl ?? "(pending)"} | 0% commission. Fair & legal.`,
  ].join("\n");
}
