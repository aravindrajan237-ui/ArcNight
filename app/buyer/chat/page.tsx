import Link from "next/link";
import { MessageCircle, Sprout } from "lucide-react";
import { getMe } from "@/lib/session";
import { AppBar, Card, PriceChip, Badge, EmptyState } from "@/components/ui";
import type { Offer, HarvestListing, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BuyerChats() {
  const { supabase, user } = await getMe();

  const { data: offerRows } = await supabase
    .from("offers")
    .select("*")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  const offers = (offerRows ?? []) as Offer[];

  // one thread per listing
  const seen = new Set<string>();
  const threads = offers.filter((o) =>
    seen.has(o.listing_id) ? false : (seen.add(o.listing_id), true),
  );

  const listingIds = threads.map((t) => t.listing_id);
  const { data: listings } = listingIds.length
    ? await supabase
        .from("harvest_listings")
        .select("id, crop, crop_photo_url, farmer_id")
        .in("id", listingIds)
    : { data: [] as Pick<HarvestListing, "id" | "crop" | "crop_photo_url" | "farmer_id">[] };
  const farmerIds = [...new Set((listings ?? []).map((l) => l.farmer_id))];
  const { data: farmers } = farmerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", farmerIds)
    : { data: [] as Pick<Profile, "id" | "full_name">[] };

  const listingOf = (id: string) => listings?.find((l) => l.id === id);
  const farmerName = (lid: string) => {
    const fid = listingOf(lid)?.farmer_id;
    return farmers?.find((f) => f.id === fid)?.full_name ?? "Farmer";
  };

  return (
    <div>
      <AppBar title="Chats" />
      <main className="mx-auto max-w-2xl px-4 pb-12 pt-6 sm:px-6">
        {threads.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="h-7 w-7" />}
            title="No conversations yet"
            description="Start negotiating from any harvest contract."
          />
        ) : (
          <div className="space-y-3">
            {threads.map((t) => {
              const li = listingOf(t.listing_id);
              return (
                <Link key={t.id} href={`/buyer/chat/${t.listing_id}`}>
                  <Card interactive inset className="flex items-center gap-3">
                    {li?.crop_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={li.crop_photo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary">
                        <Sprout className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-ink">{farmerName(t.listing_id)}</p>
                      <p className="truncate text-sm capitalize text-slate">{li?.crop}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <PriceChip amount={Number(t.proposed_price)} size="sm" />
                      {t.status === "countered" && <Badge tone="accent">Countered</Badge>}
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
