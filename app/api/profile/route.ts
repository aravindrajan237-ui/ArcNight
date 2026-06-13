import crypto from "node:crypto";
import { handle, ok, fail, requireUser, ApiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

// Handles uploads + writes per request — never prerender.
export const dynamic = "force-dynamic";

const BUCKET = "avatars";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/profile (multipart) — update the current user's name and, if an
 * `image` file is attached, their profile picture. The avatar is uploaded to
 * the public `avatars` bucket via the admin client.
 */
export const POST = handle(async (req) => {
  const { supabase, user } = await requireUser();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Expected multipart/form-data");
  }

  const name = ((form.get("full_name") as string | null) ?? "").trim();
  if (name.length < 2 || name.length > 80) {
    throw new ApiError(400, "Name must be 2–80 characters");
  }

  const admin = createAdminClient();
  const image = form.get("image");
  let photoUrl: string | undefined;

  if (image instanceof File && image.size > 0) {
    if (!image.type.startsWith("image/")) {
      return fail(400, "Please upload an image file.");
    }
    if (image.size > MAX_BYTES) {
      return fail(413, "Image is too large (max 5 MB).");
    }
    await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});
    const ext = (image.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await image.arrayBuffer()), {
        contentType: image.type,
        upsert: true,
      });
    if (upErr) throw new ApiError(400, `Upload failed: ${upErr.message}`);
    photoUrl = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const update: { full_name: string; photo_url?: string } = { full_name: name };
  if (photoUrl) update.photo_url = photoUrl;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) throw new ApiError(400, error.message);

  return ok({ full_name: name, photo_url: photoUrl ?? null });
});
