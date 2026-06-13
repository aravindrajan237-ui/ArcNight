"use client";

import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";

/**
 * Realtime chat helper (client side).
 *
 * Subscribes to INSERTs on `messages` for one listing and invokes `onMessage`
 * for every new row (human messages from /api/messages AND is_ai mediator
 * messages from /api/negotiate). Returns an unsubscribe function.
 *
 * Requires Realtime to be enabled for the messages table (see the SQL note in
 * the backend docs: `alter publication supabase_realtime add table messages;`).
 *
 * ── Optimistic UI pattern ──────────────────────────────────────────────────
 *   1. On send: append a temp message { id: `temp-${uuid}`, ...payload } to
 *      local state immediately, and POST /api/messages.
 *   2. When the realtime INSERT for that row arrives, reconcile: replace the
 *      temp row (match on sender_id + body, or swap temp id → real id) so it
 *      isn't duplicated. De-dupe by row id in `onMessage`.
 *   3. If the POST fails, mark the temp row as "failed" and offer retry.
 */
export function subscribeToListingMessages(
  listingId: string,
  onMessage: (message: Message) => void,
): () => void {
  const supabase = createClient();

  const channel = supabase
    .channel(`listing:${listingId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `listing_id=eq.${listingId}`,
      },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Send a chat message via the API. Pair with an optimistic append in the caller
 * (see pattern above). Resolves to the inserted Message, or throws on failure
 * so the caller can mark the optimistic row as failed.
 */
export async function sendListingMessage(input: {
  listing_id: string;
  receiver_id: string;
  body: string;
}): Promise<Message> {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Send failed" }));
    throw new Error(error ?? "Send failed");
  }
  const { data } = await res.json();
  return data as Message;
}
