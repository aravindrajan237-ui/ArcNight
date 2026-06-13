import { z } from "zod";
import { handle, ok, parseBody, requireUser } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { estimatePrice } from "@/lib/pricing";
import { getGeminiModel } from "@/lib/ai";
import { getLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";

const LANG_NAME: Record<string, string> = { en: "English", hi: "Hindi", ta: "Tamil" };

// Calls the pricing engine + Gemini per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/negotiate — neutral fairness mediator (B).
 *
 * Grounds itself in the pricing engine's {low, high} band, reads the offer +
 * chat history, and returns a short mediator note plus a recommended price that
 * is ALWAYS clamped inside the fair band. The reply is also inserted into the
 * existing `messages` table with is_ai = true (best-effort).
 *
 * Output JSON: { message, recommended_price }.
 */

const bodySchema = z.object({
  listing_id: z.string().uuid(),
  counterparty_id: z.string().uuid(), // the other party in the thread
  crop: z.string().min(1),
  region: z.string().min(1),
  asking_price: z.number().positive().optional(), // farmer's listed price
  current_offer: z.number().positive(),
  chat_history: z
    .array(
      z.object({
        role: z.enum(["farmer", "buyer", "ai"]),
        text: z.string().max(1000),
      }),
    )
    .max(40)
    .optional(),
});

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export const POST = handle(async (req) => {
  const { user } = await requireUser();
  const body = await parseBody(req, bodySchema);
  const locale = getLocale();

  // 1) Ground in the fair band from the pricing engine.
  const band = await estimatePrice(body.crop, body.region, locale);
  const haveBand = band.estimate > 0 && band.high > 0;
  const low = haveBand ? band.low : Math.round(body.current_offer * 0.9);
  const high = haveBand ? band.high : Math.round(body.current_offer * 1.1);
  const mid = round2((low + high) / 2);

  // 2) Ask Gemini to mediate (grounded + constrained). Falls back to a
  //    deterministic mediator note if Gemini is unavailable or misbehaves.
  let message = defaultMediatorNote(locale, body.current_offer, low, high, mid);
  let recommended = clamp(mid, low, high);

  const model = getGeminiModel({ json: true });
  if (model) {
    try {
      const history = (body.chat_history ?? [])
        .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
        .join("\n");

      const prompt = `You are a NEUTRAL fairness mediator for a farmer–buyer crop deal.
You represent NEITHER side; your only goal is a fair price for both.
Crop: ${body.crop} | Region: ${body.region}
Fair market band (₹/kg): low ${low}, high ${high} (estimate ${haveBand ? band.estimate : mid}).
${body.asking_price ? `Farmer's asking price: ₹${body.asking_price}/kg.` : ""}
Current offer on the table: ₹${body.current_offer}/kg.
Conversation so far:
${history || "(no messages yet)"}

Rules:
- recommended_price MUST be within [${low}, ${high}]. Never outside this band.
- "message" must be neutral, encouraging, and AT MOST 2 sentences of reasoning.
- Write "message" in ${LANG_NAME[locale] ?? "English"}.
Respond ONLY as JSON: {"message": string, "recommended_price": number}`;

      const res = await model.generateContent(prompt);
      const parsed = JSON.parse(res.response.text()) as {
        message?: unknown;
        recommended_price?: unknown;
      };

      if (typeof parsed.message === "string" && parsed.message.trim()) {
        message = twoSentences(parsed.message.trim());
      }
      const rec = Number(parsed.recommended_price);
      if (Number.isFinite(rec)) recommended = clamp(round2(rec), low, high);
    } catch (err) {
      console.error("[negotiate] gemini failed, using fallback:", err);
      // keep deterministic fallback values
    }
  }

  // 3) Best-effort: persist the AI reply into the shared listing thread.
  //    The mediator is system-generated, so insert with the admin (service
  //    role) client to bypass RLS reliably regardless of who triggered it.
  let message_id: string | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("messages")
      .insert({
        listing_id: body.listing_id,
        sender_id: user.id,
        receiver_id: body.counterparty_id,
        body: message,
        is_ai: true,
      })
      .select("id")
      .single();
    message_id = data?.id ?? null;
  } catch (err) {
    console.error("[negotiate] message insert failed (non-fatal):", err);
  }

  return ok({
    message,
    recommended_price: recommended,
    band: { low, high, estimate: haveBand ? band.estimate : mid },
    basis: band.basis,
    message_id,
  });
});

const round2 = (v: number) => +v.toFixed(2);

/** Keep at most the first two sentences. */
function twoSentences(text: string): string {
  const parts = text.match(/[^.!?]+[.!?]+/g);
  if (!parts) return text;
  return parts.slice(0, 2).join(" ").trim();
}

function defaultMediatorNote(
  locale: string,
  offer: number,
  low: number,
  high: number,
  mid: number,
): string {
  const vars = { offer, low, high, mid };
  if (offer < low) return translate(locale as Locale, "neg.below", vars);
  if (offer > high) return translate(locale as Locale, "neg.above", vars);
  return translate(locale as Locale, "neg.within", vars);
}
