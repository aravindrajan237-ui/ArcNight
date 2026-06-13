import Link from "next/link";
import {
  Plus,
  Sprout,
  Inbox,
  BadgeIndianRupee,
  ArrowRight,
  Star,
} from "lucide-react";
import { getMe, firstName } from "@/lib/session";
import { getT } from "@/lib/i18n/server";
import {
  Avatar,
  Card,
  StatusPill,
  PriceChip,
  Badge,
  EmptyState,
  PrimaryButton,
  type ListingStatus,
} from "@/components/ui";
import type { HarvestListing, Offer, Deal, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

function greetKey() {
  const h = new Date().getHours();
  return h < 12 ? "greet.morning" : h < 17 ? "greet.afternoon" : "greet.evening";
}

export default async function FarmerHome() {
  const t = getT();
  const { supabase, user, profile } = await getMe();

  const [{ data: listings }, { data: offers }, { data: deals }] =
    await Promise.all([
      supabase.from("harvest_listings").select("*").eq("farmer_id", user.id).order("created_at", { ascending: false }),
      supabase.from("offers").select("*").eq("farmer_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("deals").select("*").eq("farmer_id", user.id).eq("advance_paid", true),
    ]);
  const myListings = (listings ?? []) as HarvestListing[];
  const newOffers = (offers ?? []) as Offer[];
  const paidDeals = (deals ?? []) as Deal[];
  const buyerIds = [...new Set(newOffers.map((o) => o.buyer_id))];
  const { data: buyersData } = buyerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", buyerIds)
    : { data: [] as Pick<Profile, "id" | "full_name">[] };
  const buyers = (buyersData ?? []) as Pick<Profile, "id" | "full_name">[];
  const buyerName = (id: string) =>
    buyers?.find((b) => b.id === id)?.full_name ?? "A buyer";
  const cropOf = (id: string) =>
    myListings.find((l) => l.id === id)?.crop ?? "harvest";

  const advanceTotal = paidDeals.reduce(
    (s, d) => s + Number(d.advance_amount ?? 0),
    0,
  );
  const deals0 = profile?.completed_deals ?? 0;
  const trustStars = (profile?.trust_score ?? 0) / 20;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      {/* Greeting */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate">{t(greetKey())},</p>
          <h1 className="text-2xl font-extrabold text-ink">
            {firstName(profile)} 👋
          </h1>
        </div>
        <Link href="/farmer/profile" className="flex items-center gap-2.5">
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-bold text-ink">
              {profile?.full_name ?? "You"}
            </span>
            <span className="flex items-center justify-end gap-1 text-xs text-slate">
              {deals0 > 0 ? (
                <>
                  <Star className="h-3 w-3 text-warning" fill="currentColor" />
                  {trustStars.toFixed(1)} · {deals0} deals
                </>
              ) : (
                "New farmer"
              )}
            </span>
          </span>
          <Avatar
            name={profile?.full_name}
            src={profile?.photo_url}
            size="md"
            trustScore={deals0 > 0 ? trustStars : undefined}
          />
        </Link>
      </header>

      {/* Add harvest CTA */}
      <Link href="/farmer/listings/new" className="mt-6 block">
        <div className="flex items-center justify-between rounded-card bg-accent p-5 text-white shadow-soft transition active:scale-[0.99]">
          <span className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Plus className="h-7 w-7" />
            </span>
            <span>
              <span className="block text-lg font-extrabold">{t("farmer.addHarvest")}</span>
              <span className="text-sm text-white/85">{t("farmer.addHarvestSub")}</span>
            </span>
          </span>
          <ArrowRight className="h-6 w-6" />
        </div>
      </Link>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat icon={<Sprout className="h-5 w-5" />} label={t("farmer.statListings")} value={myListings.length} />
        <Stat icon={<Inbox className="h-5 w-5" />} label={t("farmer.statOffers")} value={newOffers.length} accent />
        <Stat
          icon={<BadgeIndianRupee className="h-5 w-5" />}
          label={t("farmer.statAdvance")}
          value={advanceTotal.toLocaleString("en-IN")}
        />
      </div>

      {/* New offers */}
      {newOffers.length > 0 && (
        <section className="mt-8">
          <SectionHead title={t("farmer.newOffers")} badge={newOffers.length} />
          <div className="space-y-3">
            {newOffers.slice(0, 4).map((o) => (
              <Link key={o.id} href={`/farmer/listings/${o.listing_id}`}>
                <Card interactive inset className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-ink">
                      {buyerName(o.buyer_id)}
                    </p>
                    <p className="text-sm text-slate">
                      wants {o.proposed_qty_kg} kg of {cropOf(o.listing_id)}
                    </p>
                  </div>
                  <PriceChip amount={Number(o.proposed_price)} />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My listings */}
      <section className="mt-8">
        <SectionHead title={t("farmer.myListings")} />
        {myListings.length === 0 ? (
          <EmptyState
            icon={<Sprout className="h-7 w-7" />}
            title={t("farmer.noListings")}
            description="Publish your first harvest contract to start receiving offers."
            action={
              <Link href="/farmer/listings/new">
                <PrimaryButton leftIcon={<Plus className="h-5 w-5" />}>
                  Add Harvest
                </PrimaryButton>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {myListings.map((l) => (
              <Link key={l.id} href={`/farmer/listings/${l.id}`}>
                <Card interactive className="overflow-hidden">
                  {l.crop_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.crop_photo_url}
                      alt={l.crop}
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <div className="bg-map-grid flex h-28 items-center justify-center">
                      <Sprout className="h-8 w-8 text-primary/50" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold capitalize text-ink">{l.crop}</h3>
                      <StatusPill status={l.status as ListingStatus} size="sm" />
                    </div>
                    <p className="mt-0.5 text-sm text-slate">
                      {l.quantity_kg} kg
                      {l.variety ? ` · ${l.variety}` : ""}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <PriceChip amount={Number(l.offer_price ?? 0)} size="sm" />
                      {l.is_organic && (
                        <Badge tone="success">Organic</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className="p-4">
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
          accent ? "bg-accent-50 text-accent-700" : "bg-primary-50 text-primary"
        }`}
      >
        {icon}
      </span>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-ink">
        {value}
      </p>
      <p className="text-xs font-medium text-slate">{label}</p>
    </Card>
  );
}

function SectionHead({ title, badge }: { title: string; badge?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {!!badge && badge > 0 && <Badge tone="accent">{badge}</Badge>}
    </div>
  );
}
