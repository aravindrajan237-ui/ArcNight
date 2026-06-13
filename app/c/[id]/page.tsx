import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Leaf,
  ShieldCheck,
  Calendar,
  MapPin,
  Star,
  BadgePercent,
  Sprout,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo, Card, PriceChip, Badge, Avatar, Button } from "@/components/ui";
import { capitalize } from "@/lib/format";
import type { HarvestListing, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

async function fetchContract(id: string) {
  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("harvest_listings")
    .select("*")
    .eq("id", id)
    .single();
  if (!listing) return null;
  const { data: farmer } = await admin
    .from("profiles")
    .select("id, full_name, photo_url, trust_score, completed_deals")
    .eq("id", (listing as HarvestListing).farmer_id)
    .single();
  return { listing: listing as HarvestListing, farmer: farmer as Partial<Profile> | null };
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const data = await fetchContract(params.id).catch(() => null);
  if (!data) return { title: "Harvest contract" };
  const { listing: l } = data;
  const title = `${capitalize(l.crop)} · ${Number(l.quantity_kg)} kg · ₹${Number(l.offer_price ?? 0)}/kg`;
  const description = `Fresh ${l.crop} harvest on HarvestLink — direct from the farmer, 0% commission.${
    l.is_organic ? " Organic." : ""
  }${l.is_negotiable ? " Negotiable." : ""}`;
  return {
    title,
    description,
    openGraph: {
      title: `${title} · HarvestLink`,
      description,
      images: l.crop_photo_url ? [{ url: l.crop_photo_url }] : undefined,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicContract({
  params,
}: {
  params: { id: string };
}) {
  const data = await fetchContract(params.id);
  if (!data) notFound();
  const { listing: l, farmer: f } = data;
  const stars = (f?.trust_score ?? 0) / 20;
  const deals = f?.completed_deals ?? 0;
  const next = `/buyer/listings/${l.id}`;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <Link href={`/login?next=${encodeURIComponent(next)}`}>
          <Button size="sm" variant="outline">Sign in</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 pb-12 sm:px-6">
        <Card className="overflow-hidden">
          {l.crop_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.crop_photo_url} alt={l.crop} className="h-60 w-full object-cover" />
          ) : (
            <div className="bg-map-grid flex h-60 items-center justify-center">
              <Sprout className="h-14 w-14 text-primary/40" />
            </div>
          )}
          <div className="space-y-3 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-extrabold capitalize text-ink">{l.crop}</h1>
                <p className="text-slate">
                  {Number(l.quantity_kg)} kg{l.variety ? ` · ${l.variety}` : ""}
                </p>
              </div>
              <PriceChip amount={Number(l.offer_price ?? 0)} size="lg" />
            </div>

            <div className="flex flex-wrap gap-2">
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

            <div className="space-y-1.5 text-sm text-slate">
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Harvest {l.expected_harvest_date ?? "TBD"}
              </p>
              {l.location_label && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {l.location_label}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Farmer trust */}
        <Card inset className="flex items-center gap-3">
          <Avatar name={f?.full_name} src={f?.photo_url} size="lg" trustScore={deals > 0 ? stars : undefined} />
          <div>
            <p className="font-bold text-ink">{f?.full_name ?? "Farmer"}</p>
            <p className="flex items-center gap-1 text-sm text-slate">
              {deals > 0 ? (
                <>
                  <Star className="h-3.5 w-3.5 text-warning" fill="currentColor" /> {stars.toFixed(1)} · {deals} deals
                </>
              ) : (
                "New farmer"
              )}
            </p>
          </div>
        </Card>

        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <BadgePercent className="h-4 w-4" /> 0% platform commission. Fair &amp; legal.
        </div>

        <Link href={`/login?next=${encodeURIComponent(next)}`} className="block">
          <Button size="xl" fullWidth>
            Reserve or contact the farmer
          </Button>
        </Link>
        <p className="text-center text-xs text-slate">
          You&apos;ll be asked to sign in to make an offer.
        </p>
      </main>
    </div>
  );
}
