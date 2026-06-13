import { notFound } from "next/navigation";
import { getMe } from "@/lib/session";
import { AppBar, Avatar } from "@/components/ui";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { ReportButton } from "@/components/ReportButton";
import { capitalize } from "@/lib/format";
import type { HarvestListing, Offer, Message, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FarmerChat({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { buyer?: string };
}) {
  const { supabase, user } = await getMe();

  const { data: listing } = await supabase
    .from("harvest_listings")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!listing) notFound();
  const l = listing as HarvestListing;

  // Determine the buyer (query param, else most recent offer).
  const { data: offerRows } = await supabase
    .from("offers")
    .select("*")
    .eq("listing_id", l.id)
    .order("created_at", { ascending: false });
  const offers = (offerRows ?? []) as Offer[];
  const buyerId = searchParams.buyer ?? offers[0]?.buyer_id;

  const { data: buyer } = buyerId
    ? await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .eq("id", buyerId)
        .single()
    : { data: null };
  const b = buyer as Pick<Profile, "id" | "full_name" | "photo_url"> | null;

  const { data: msgRows } = await supabase
    .from("messages")
    .select("*")
    .eq("listing_id", l.id)
    .order("created_at", { ascending: true });
  const messages = ((msgRows ?? []) as Message[]).filter(
    (m) => !buyerId || m.sender_id === buyerId || m.receiver_id === buyerId || m.is_ai,
  );

  const latestPending = offers.find(
    (o) => o.buyer_id === buyerId && o.status === "pending",
  );

  return (
    <div>
      <AppBar
        title={b?.full_name ?? "Negotiation"}
        subtitle={`${capitalize(l.crop)} · ${Number(l.quantity_kg)} kg`}
        back={`/farmer/listings/${l.id}`}
        leading={
          <Avatar name={b?.full_name} src={b?.photo_url} size="sm" />
        }
        actions={buyerId ? <ReportButton reportedUserId={buyerId} listingId={l.id} label="" /> : undefined}
      />
      {buyerId && b ? (
        <ChatRoom
          listingId={l.id}
          meId={user.id}
          counterpartyId={buyerId}
          counterpartyName={b.full_name ?? "Buyer"}
          crop={l.crop}
          region={l.location_label ?? "India"}
          role="farmer"
          initialMessages={messages}
          latestOffer={
            latestPending
              ? {
                  id: latestPending.id,
                  price: Number(latestPending.proposed_price),
                  qty: Number(latestPending.proposed_qty_kg),
                }
              : null
          }
        />
      ) : (
        <p className="mx-auto max-w-2xl px-6 py-16 text-center text-slate">
          No buyer has made an offer on this harvest yet.
        </p>
      )}
    </div>
  );
}
