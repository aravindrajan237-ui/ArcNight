import { handle, ok, parseBody, requireUser, ApiError } from "@/lib/api";
import { createMessageSchema } from "@/lib/validation";

// Inserts per request — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/messages — send a human chat message on a harvest listing.
 *
 * Chat is scoped to a listing (the realtime channel key). The message is
 * inserted with is_ai=false; AI mediator messages (is_ai=true) are inserted by
 * /api/negotiate. Both land in the same `messages` table, so subscribers to the
 * listing channel see human + AI messages live.
 *
 * Realtime (client side, see lib/realtime.ts):
 *   supabase.channel(`listing:${listingId}`)
 *     .on("postgres_changes",
 *         { event: "INSERT", schema: "public", table: "messages",
 *           filter: `listing_id=eq.${listingId}` },
 *         ({ new: row }) => append(row))
 *     .subscribe();
 *
 * Insert uses the user-scoped client so RLS enforces sender_id = auth.uid()
 * (messages_insert_sender policy in 0001_init.sql).
 */
export const POST = handle(async (req) => {
  const { supabase, user } = await requireUser();
  const body = await parseBody(req, createMessageSchema);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      listing_id: body.listing_id,
      sender_id: user.id,
      receiver_id: body.receiver_id,
      body: body.body ?? "",
      audio_url: body.audio_url ?? null,
      audio_duration_sec: body.audio_duration_sec ?? null,
      is_ai: false,
    })
    .select("*")
    .single();

  // RLS rejects inserts where sender_id != auth.uid().
  if (error) throw new ApiError(403, "Cannot post to this conversation");
  return ok(data, 201);
});
