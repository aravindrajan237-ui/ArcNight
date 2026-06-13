import { z } from "zod";
import { handle, ok, parseBody, requireUser } from "@/lib/api";
import { getGeminiModel } from "@/lib/ai";

// Calls Gemini per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/voice-parse — server parser for the voice-first listing flow (D).
 *
 * Input: { transcript, lang } (en-IN | hi-IN | ta-IN). Gemini extracts the
 * structured fields used to pre-fill the create-listing form:
 *   { crop, quantity_kg, harvest_in_days }
 *
 * Gemini handles Hindi/Tamil transcripts directly and returns the crop name in
 * English. On any failure it returns all-null fields (never crashes), so the
 * client just leaves the form blank.
 */

const bodySchema = z.object({
  transcript: z.string().min(1).max(1000),
  lang: z.enum(["en-IN", "hi-IN", "ta-IN"]).default("en-IN"),
});

export const POST = handle(async (req) => {
  await requireUser(); // farmers only reach this via the listing screen
  const body = await parseBody(req, bodySchema);

  const empty = { crop: null, quantity_kg: null, harvest_in_days: null };

  const model = getGeminiModel({ json: true });
  if (!model) return ok(empty);

  try {
    const prompt = `Extract crop listing details from this farmer's spoken sentence.
The sentence may be in English, Hindi, or Tamil (language code: ${body.lang}).
Sentence: "${body.transcript}"

Return ONLY JSON with these fields (use null if not mentioned):
{"crop": string|null, "quantity_kg": number|null, "harvest_in_days": number|null}
Rules:
- "crop" must be the English crop name (e.g. "tomato", "onion").
- Convert quantities to kilograms (1 quintal = 100 kg, 1 ton = 1000 kg).
- "harvest_in_days": how many days until harvest (e.g. "next week" -> 7).`;

    const res = await model.generateContent(prompt);
    const parsed = JSON.parse(res.response.text());

    return ok({
      crop:
        typeof parsed.crop === "string" && parsed.crop.trim()
          ? parsed.crop.trim().toLowerCase()
          : null,
      quantity_kg: toPositiveNumber(parsed.quantity_kg),
      harvest_in_days: toPositiveNumber(parsed.harvest_in_days),
    });
  } catch (err) {
    console.error("[voice-parse] gemini failed:", err);
    return ok(empty); // graceful: form stays blank
  }
});

function toPositiveNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
