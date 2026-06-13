import Link from "next/link";
import { notFound } from "next/navigation";
import { Leaf, ShieldCheck, Calendar, Sprout, Star, BadgePercent } from "lucide-react";
import { getMe } from "@/lib/session";
import { AppBar, Card, PriceChip, Badge, Avatar, AwardBadge } from "@/components/ui";
import { FairDealGauge } from "@/components/buyer/FairDealGauge";
import { ReserveButton } from "@/components/buyer/ReserveButton";
import { fairDealScore } from "@/lib/ai";
import { capitalize, titleCase } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import type { HarvestListing, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BuyerListingDetail({
  params,
}: {
  params: { id: string };
}) {
  const t = getT();
  const { supabase } = await getMe();

  const { data: listing } = await supabase
    .from("harvest_listings")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!listing) notFound();
  const l = listing as HarvestListing;

  const { data: farmer } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url, trust_score, completed_deals, on_time_rate")
    .eq("id", l.farmer_id)
    .single();
  const f = farmer as Partial<Profile> | null;

  const offer = Number(l.offer_price ?? 0);
  const market = Number(l.market_price ?? 0);
  const score =
    l.fair_deal_score ?? (market > 0 ? fairDealScore(offer, market) : 0);
  const marketDiff =
    market > 0 ? Math.round(((offer - market) / market) * 100) : undefined;
  const stars = (f?.trust_score ?? 0) / 20;
  const deals = f?.completed_deals ?? 0;

  return (
    <div>
      <AppBar title={capitalize(l.crop)} subtitle={titleCase(l.variety) || undefined} back="/buyer" />
      <main className="mx-auto max-w-2xl space-y-5 px-4 pb-44 pt-5 sm:px-6 md:pb-32">
        {/* Photo */}
        <Card className="overflow-hidden">
          {l.crop_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.crop_photo_url} alt={l.crop} className="h-56 w-full object-cover" />
          ) : (
            <div className="bg-map-grid flex h-56 items-center justify-center">
              <Sprout className="h-12 w-12 text-primary/40" />
            </div>
          )}
        </Card>

        {/* Title + badges */}
        <div>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold capitalize text-ink">{l.crop}</h1>
            <PriceChip amount={offer} size="lg" />
          </div>
          <p className="mt-0.5 text-slate">{Number(l.quantity_kg)} kg available</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {l.is_negotiable && <Badge tone="accent">{t("card.negotiable")}</Badge>}
            {l.is_organic && (
              <Badge tone="success" icon={<Leaf className="h-3.5 w-3.5" />}>{t("card.organic")}</Badge>
            )}
            {l.ai_quality_label && (
              <Badge tone="primary" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                {l.ai_quality_label}
              </Badge>
            )}
            <Badge>
              <Calendar className="mr-1 h-3.5 w-3.5" />
              {l.expected_harvest_date ?? "TBD"}
            </Badge>
          </div>
        </div>

        {/* Fair deal score */}
        <Card inset className="flex flex-col items-center">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate">
            {t("detail.fairScore")}
          </h2>
          <FairDealGauge score={score} marketDiffPct={marketDiff} />
          <div className="mt-3 flex items-center gap-3">
            {market > 0 && <PriceChip amount={market} tone="market" label={t("detail.market")} />}
            <PriceChip amount={offer} label={t("detail.offer")} />
          </div>
        </Card>

        {/* Farmer */}
        <Link href={`/u/${l.farmer_id}`}>
          <Card interactive inset className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                name={f?.full_name}
                src={f?.photo_url}
                size="lg"
                trustScore={deals > 0 ? stars : undefined}
              />
              <div>
                <p className="font-bold text-ink">{f?.full_name ?? "Farmer"}</p>
                <p className="flex items-center gap-1 text-sm text-slate">
                  {deals > 0 ? (
                    <>
                      <Star className="h-3.5 w-3.5 text-warning" fill="currentColor" />
                      {stars.toFixed(1)} · {deals} deals
                    </>
                  ) : (
                    "New farmer"
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              {deals >= 10 && <AwardBadge award="best-seller" size="sm" />}
              {l.is_organic && <AwardBadge award="organic-hero" size="sm" />}
            </div>
          </Card>
        </Link>

        {/* 0% commission reassurance */}
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <BadgePercent className="h-4 w-4" />
          HarvestLink takes 0% — the price you agree is the price that moves.
        </div>
      </main>

      {/* Sticky actions — sits above the mobile bottom nav (64px) */}
      <div className="fixed inset-x-0 bottom-[64px] z-20 border-t border-mist bg-white/95 p-4 backdrop-blur md:bottom-0 md:pl-64">
        <div className="mx-auto max-w-2xl">
          <ReserveButton
            listingId={l.id}
            crop={l.crop}
            price={offer}
            available={Number(l.quantity_kg)}
            photoUrl={l.crop_photo_url}
            farmerName={f?.full_name ?? "Farmer"}
            chatHref={`/buyer/chat/${l.id}`}
          />
        </div>
      </div>
    </div>
  );
}
