import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getMe } from "@/lib/session";
import { AppBar, Card, Avatar, PriceChip, Badge, EmptyState } from "@/components/ui";
import type { Offer, HarvestListing, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FarmerChats() {
  const { supabase, user } = await getMe();

  const { data: offerRows } = await supabase
    .from("offers")
    .select("*")
    .eq("farmer_id", user.id)
    .order("created_at", { ascending: false });
  const offers = (offerRows ?? []) as Offer[];

  // One conversation per (listing, buyer) — keep the most recent offer.
  const seen = new Set<string>();
  const threads = offers.filter((o) => {
    const key = `${o.listing_id}:${o.buyer_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const listingIds = [...new Set(threads.map((t) => t.listing_id))];
  const buyerIds = [...new Set(threads.map((t) => t.buyer_id))];
  const [{ data: listings }, { data: buyers }] = await Promise.all([
    listingIds.length
      ? supabase.from("harvest_listings").select("id, crop").in("id", listingIds)
      : Promise.resolve({ data: [] as Pick<HarvestListing, "id" | "crop">[] }),
    buyerIds.length
      ? supabase.from("profiles").select("id, full_name, photo_url").in("id", buyerIds)
      : Promise.resolve({ data: [] as Partial<Profile>[] }),
  ]);

  const cropOf = (id: string) => listings?.find((l) => l.id === id)?.crop ?? "harvest";
  const buyerOf = (id: string) => buyers?.find((b) => b.id === id);

  return (
    <div>
      <AppBar title="Chats" />
      <main className="mx-auto max-w-2xl px-4 pb-12 pt-6 sm:px-6">
        {threads.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-7 w-7" />}
            title="No conversations yet"
            description="When buyers make offers, your negotiations appear here."
          />
        ) : (
          <div className="space-y-3">
            {threads.map((t) => {
              const b = buyerOf(t.buyer_id);
              return (
                <Link key={t.id} href={`/farmer/chat/${t.listing_id}?buyer=${t.buyer_id}`}>
                  <Card interactive inset className="flex items-center gap-3">
                    <Avatar name={b?.full_name} src={b?.photo_url} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">
                        {b?.full_name ?? "Buyer"}
                      </p>
                      <p className="truncate text-sm capitalize text-slate">
                        {cropOf(t.listing_id)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <PriceChip amount={Number(t.proposed_price)} size="sm" />
                      {t.status === "pending" && <Badge tone="accent">New</Badge>}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
