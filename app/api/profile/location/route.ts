import { z } from "zod";
import { handle, ok, parseBody, requireUser, ApiError } from "@/lib/api";

// Writes per request — never prerender.
export const dynamic = "force-dynamic";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  location_label: z.string().max(120).optional(),
});

/** POST /api/profile/location — update the current user's saved location. */
export const POST = handle(async (req) => {
  const { supabase, user } = await requireUser();
  const body = await parseBody(req, schema);

  const { error } = await supabase
    .from("profiles")
    .update({
      lat: body.lat,
      lng: body.lng,
      location_label: body.location_label ?? null,
    })
    .eq("id", user.id);

  if (error) throw new ApiError(400, error.message);
  return ok({ saved: true });
});
