import crypto from "node:crypto";
import { handle, ok, fail, requireUser, ApiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

// Handles file uploads per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/verify-crop  (multipart/form-data)
 *   fields: image (file, required), listing_id (uuid, optional)
 *
 * Uploads the crop photo to Supabase Storage and (if a listing_id is given)
 * stores its public URL on the listing. AI vision verification was removed —
 * this is now a plain, reliable photo upload.
 *
 * Returns: { crop_photo_url }
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

  // ---- upload photo to storage ----
  const admin = createAdminClient();
  let crop_photo_url: string | null = null;
  try {
    // Ensure the bucket exists (no-op if already created).
    await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

    const ext = image.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: image.type, upsert: true });
    if (upErr) {
      console.error("[verify-crop] storage upload failed:", upErr);
      return fail(502, "Couldn't upload the photo right now. Please try again.");
    }
    crop_photo_url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (err) {
    console.error("[verify-crop] storage upload threw:", err);
    return fail(502, "Couldn't upload the photo right now. Please try again.");
  }

  // ---- persist onto the listing (best-effort) ----
  if (listingId && crop_photo_url) {
    try {
      await admin
        .from("harvest_listings")
        .update({ crop_photo_url })
        .eq("id", listingId)
        .eq("farmer_id", user.id); // only the owner's listing
    } catch (err) {
      console.error("[verify-crop] listing update failed (non-fatal):", err);
    }
  }

  return ok({ crop_photo_url });
});
