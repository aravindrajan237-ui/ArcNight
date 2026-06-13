import { z } from "zod";
import { handle, ok, parseBody, requireUser } from "@/lib/api";
import { getGeminiModel } from "@/lib/ai";

// Calls Gemini per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/translate  { text, target }
 *
 * Translates a chat message into the viewer's language so two users chatting in
 * different languages (e.g. Hindi ↔ Tamil) can understand each other. Returns
 * the original text unchanged if translation is unavailable, so chat never
 * breaks.
 *
 * Returns: { text, translated: boolean }
 */

const LANG_NAME: Record<string, string> = { en: "English", hi: "Hindi", ta: "Tamil" };

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
  target: z.enum(["en", "hi", "ta"]),
});

export const POST = handle(async (req) => {
  await requireUser();
  const { text, target } = await parseBody(req, bodySchema);

  const model = getGeminiModel();
  if (!model) return ok({ text, translated: false });

  try {
    const prompt = `Translate the message below into ${LANG_NAME[target]}.
Rules:
- Return ONLY the translated text — no quotes, no notes, no explanation.
- If the message is already in ${LANG_NAME[target]}, return it unchanged.
- Preserve numbers, prices (₹), and units exactly.

Message:
${text}`;
    const res = await model.generateContent(prompt);
    const out = res.response.text().trim();
    if (!out) return ok({ text, translated: false });
    return ok({ text: out, translated: out !== text });
  } catch (err) {
    console.error("[translate] gemini failed:", err);
    return ok({ text, translated: false });
  }
});
