import crypto from "node:crypto";
import { handle, ok, fail, requireUser, ApiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGeminiModel } from "@/lib/ai";

// Handles uploads + Gemini vision per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/verify-crop  (multipart/form-data)
 *   fields: image (file, required), listing_id (uuid, optional)
 *
 * Sends the photo to Gemini vision and returns:
 *   { crop_type, estimated_quality: 'low'|'medium'|'high', growth_stage,
 *     confidence: 0..1 }
 * The image is uploaded to Supabase Storage; if a listing_id is given, the
 * listing's ai_quality_label + crop_photo_url are updated.
 *
 * Friendly errors (not crashes) for: missing/invalid image, not-a-crop photo,
 * and Gemini/network failure.
 */

const BUCKET = "crop-photos";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export const POST = handle(async (req) => {
  const { user } = await requireUser();

  // ---- parse multipart ----
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Expected multipart/form-data with an `image` field.");
  }

  const image = form.get("image");
  const listingId = (form.get("listing_id") as string | null) ?? null;

  if (!(image instanceof File)) {
    return fail(400, "Please attach an image in the `image` field.");
  }
  if (!image.type.startsWith("image/")) {
    return fail(400, "That file isn't an image. Please upload a crop photo (JPG/PNG).");
  }
  if (image.size > MAX_BYTES) {
    return fail(413, "Image is too large. Please upload a photo under 8 MB.");
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const base64 = bytes.toString("base64");

  // ---- Gemini vision ----
  const model = getGeminiModel({ json: true });
  if (!model) {
    return fail(
      503,
      "Crop verification is temporarily unavailable. You can still create the listing.",
    );
  }

  let analysis: {
    is_crop: boolean;
    crop_type: string;
    estimated_quality: "low" | "medium" | "high";
    growth_stage: string;
    confidence: number;
  };

  try {
    const prompt = `You are an agronomy assistant. Look at this photo of (hopefully) a harvested crop or a crop plant.
Respond ONLY as JSON:
{"is_crop": boolean, "crop_type": string, "estimated_quality": "low"|"medium"|"high", "growth_stage": string, "confidence": number between 0 and 1}
If the image is NOT a crop/produce/plant, set is_crop=false and confidence accordingly.`;

    const res = await model.generateContent([
      { inlineData: { data: base64, mimeType: image.type } },
      { text: prompt },
    ]);
    const parsed = JSON.parse(res.response.text());

    analysis = {
      is_crop: parsed.is_crop !== false,
      crop_type: String(parsed.crop_type ?? "unknown"),
      estimated_quality: ["low", "medium", "high"].includes(parsed.estimated_quality)
        ? parsed.estimated_quality
        : "medium",
      growth_stage: String(parsed.growth_stage ?? "unknown"),
      confidence: clamp01(Number(parsed.confidence)),
    };
  } catch (err) {
    console.error("[verify-crop] gemini vision failed:", err);
    return fail(
      503,
      "Couldn't analyze the photo right now. Please try again in a moment.",
    );
  }

  // ---- not a crop → friendly error ----
  if (!analysis.is_crop) {
    return fail(
      422,
      "That photo doesn't look like a crop. Please upload a clear picture of your produce or plant.",
    );
  }

  // ---- upload photo to storage (best-effort) ----
  const admin = createAdminClient();
  let crop_photo_url: string | null = null;
  try {
    // Ensure the bucket exists (no-op if already created).
    await admin.storage
      .createBucket(BUCKET, { public: true })
      .catch(() => {}); // already-exists errors are fine

    const ext = image.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: image.type, upsert: true });
    if (!upErr) {
      crop_photo_url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }
  } catch (err) {
    console.error("[verify-crop] storage upload failed (non-fatal):", err);
  }

  // ---- persist onto the listing (best-effort) ----
  const ai_quality_label = `${analysis.estimated_quality} quality ${analysis.crop_type} (${analysis.growth_stage})`;
  if (listingId) {
    try {
      await admin
        .from("harvest_listings")
        .update({
          ai_quality_label,
          ...(crop_photo_url ? { crop_photo_url } : {}),
        })
        .eq("id", listingId)
        .eq("farmer_id", user.id); // only the owner's listing
    } catch (err) {
      console.error("[verify-crop] listing update failed (non-fatal):", err);
    }
  }

  return ok({
    crop_type: analysis.crop_type,
    estimated_quality: analysis.estimated_quality,
    growth_stage: analysis.growth_stage,
    confidence: analysis.confidence,
    ai_quality_label,
    crop_photo_url,
  });
});

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(1, Math.max(0, +v.toFixed(2)));
}
