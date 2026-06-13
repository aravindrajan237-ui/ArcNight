import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Sprout, Leaf, ShieldCheck, Calendar } from "lucide-react";
import { getMe } from "@/lib/session";
import {
  AppBar,
  Card,
  StatusPill,
  PriceChip,
  Badge,
  Avatar,
  EmptyState,
  type ListingStatus,
} from "@/components/ui";
import { ShareButton } from "@/components/farmer/ShareButton";
import { OfferActions } from "@/components/farmer/OfferActions";
import { capitalize, titleCase } from "@/lib/format";
import type { HarvestListing, Offer, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FarmerListingDetail({
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
  const owner = l.farmer_id === user.id;

  const { data: offerRows } = await supabase
    .from("offers")
    .select("*")
    .eq("listing_id", l.id)
    .order("created_at", { ascending: false });
  const offers = (offerRows ?? []) as Offer[];
  const pending = offers.filter((o) => o.status === "pending");

  const buyerIds = [...new Set(offers.map((o) => o.buyer_id))];
  const { data: buyers } = buyerIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, photo_url, trust_score, completed_deals")
        .in("id", buyerIds)
    : { data: [] as Partial<Profile>[] };
  const buyer = (id: string) => buyers?.find((b) => b.id === id);

  return (
    <div>
      <AppBar
        title={capitalize(l.crop)}
        subtitle={titleCase(l.variety) || undefined}
        back="/farmer"
        actions={owner ? <ShareButton listingId={l.id} /> : undefined}
      />
      <main className="mx-auto max-w-2xl space-y-6 px-4 pb-12 pt-6 sm:px-6">
        {/* Hero */}
        <Card className="overflow-hidden">
          {l.crop_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.crop_photo_url} alt={l.crop} className="h-52 w-full object-cover" />
          ) : (
            <div className="bg-map-grid flex h-52 items-center justify-center">
              <Sprout className="h-12 w-12 text-primary/40" />
            </div>
          )}
          <div className="space-y-3 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-extrabold capitalize text-ink">
                  {l.crop}
                </h1>
                <p className="text-slate">{Number(l.quantity_kg)} kg available</p>
              </div>
              <StatusPill status={l.status as ListingStatus} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PriceChip amount={Number(l.offer_price ?? 0)} size="lg" />
              {l.market_price && (
                <PriceChip amount={Number(l.market_price)} tone="market" label="Market" />
              )}
              {l.is_negotiable && <Badge tone="accent">Negotiable</Badge>}
              {l.is_organic && (
                <Badge tone="success" icon={<Leaf className="h-3.5 w-3.5" />}>Organic</Badge>
              )}
              {l.ai_quality_label && (
                <Badge tone="primary" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                  {l.ai_quality_label}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-slate">
              <Calendar className="h-4 w-4" />
              Harvest {l.expected_harvest_date ?? "TBD"}
              {l.location_label ? ` · ${l.location_label}` : ""}
            </div>
          </div>
        </Card>

        {/* Offers */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink">
            Offers {pending.length > 0 && <Badge tone="accent">{pending.length} new</Badge>}
          </h2>

          {offers.length === 0 ? (
            <EmptyState
              icon={<Sprout className="h-7 w-7" />}
              title="No offers yet"
              description="Share this contract to reach more buyers."
            />
          ) : (
            <div className="space-y-3">
              {offers.map((o) => {
                const b = buyer(o.buyer_id);
                const stars = (b?.trust_score ?? 0) / 20;
                return (
                  <Card key={o.id} inset>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={b?.full_name}
                          src={b?.photo_url}
                          size="md"
                          trustScore={(b?.completed_deals ?? 0) > 0 ? stars : undefined}
                        />
                        <div>
                          <p className="font-bold text-ink">
                            {b?.full_name ?? "A buyer"}
                          </p>
                          <p className="text-sm text-slate">
                            {Number(o.proposed_qty_kg)} kg ·{" "}
                            <span className="capitalize">{o.status}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <PriceChip amount={Number(o.proposed_price)} />
                      </div>
                    </div>

                    {o.status === "pending" && owner && (
                      <OfferActions
                        offerId={o.id}
                        buyerName={b?.full_name ?? "buyer"}
                        proposedPrice={Number(o.proposed_price)}
                        proposedQty={Number(o.proposed_qty_kg)}
                      />
                    )}

                    <Link
                      href={`/farmer/chat/${l.id}?buyer=${o.buyer_id}`}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
                    >
                      <MessageCircle className="h-4 w-4" /> Open chat
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
