import { notFound } from "next/navigation";
import { getMe } from "@/lib/session";
import { AppBar, Avatar } from "@/components/ui";
import { ChatRoom } from "@/components/chat/ChatRoom";
import { ReportButton } from "@/components/ReportButton";
import { capitalize } from "@/lib/format";
import type { HarvestListing, Offer, Message, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BuyerChat({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, user } = await getMe();

  const { data: listing } = await supabase
    .from("harvest_listings")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!listing) notFound();
  const l = listing as HarvestListing;

  const { data: farmer } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url")
    .eq("id", l.farmer_id)
    .single();
  const f = farmer as Pick<Profile, "id" | "full_name" | "photo_url"> | null;

  const { data: msgRows } = await supabase
    .from("messages")
    .select("*")
    .eq("listing_id", l.id)
    .order("created_at", { ascending: true });
  const messages = (msgRows ?? []) as Message[];

  const { data: offerRows } = await supabase
    .from("offers")
    .select("*")
    .eq("listing_id", l.id)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  const latest = (offerRows ?? [])[0] as Offer | undefined;

  return (
    <div>
      <AppBar
        title={f?.full_name ?? "Farmer"}
        subtitle={`${capitalize(l.crop)} · ₹${Number(l.offer_price ?? 0)}/kg`}
        back={`/buyer/listings/${l.id}`}
        leading={<Avatar name={f?.full_name} src={f?.photo_url} size="sm" />}
        actions={<ReportButton reportedUserId={l.farmer_id} listingId={l.id} label="" />}
      />
      <ChatRoom
        listingId={l.id}
        meId={user.id}
        counterpartyId={l.farmer_id}
        counterpartyName={f?.full_name ?? "Farmer"}
        crop={l.crop}
        region={l.location_label ?? "India"}
        role="buyer"
        initialMessages={messages}
        latestOffer={
          latest
            ? {
                id: latest.id,
                price: Number(latest.proposed_price),
                qty: Number(latest.proposed_qty_kg),
              }
            : {
                id: "",
                price: Number(l.offer_price ?? 0),
                qty: Number(l.quantity_kg),
              }
        }
      />
    </div>
  );
}
