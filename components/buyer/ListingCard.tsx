"use client";

import Link from "next/link";
import { Leaf, ShieldCheck, Navigation, Calendar, Star, Sprout } from "lucide-react";
import { Card, PriceChip, Badge } from "@/components/ui";
import { useT } from "@/lib/i18n/client";
import { capitalize } from "@/lib/format";
import type { ListingWithFarmer } from "@/app/api/listings/route";

/** Harvest contract card for the buyer browse list. */
export function ListingCard({ l }: { l: ListingWithFarmer }) {
  const t = useT();
  const stars = (l.farmer?.trust_score ?? 0) / 20;
  return (
    <Link href={`/buyer/listings/${l.id}`} className="block min-w-0">
      <Card interactive className="overflow-hidden">
        <div className="relative">
          {l.crop_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.crop_photo_url} alt={l.crop} className="h-40 w-full object-cover" />
          ) : (
            <div className="bg-map-grid flex h-40 items-center justify-center">
              <Sprout className="h-10 w-10 text-primary/40" />
            </div>
          )}
          {typeof l.distance_km === "number" && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-pill bg-white/95 px-2.5 py-1 text-xs font-bold text-ink shadow-soft backdrop-blur">
              <Navigation className="h-3 w-3 text-primary" />
              {l.distance_km} km
            </span>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            {l.is_organic && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-success px-2 py-1 text-xs font-bold text-white shadow-soft">
                <Leaf className="h-3 w-3" /> {t("card.organic")}
              </span>
            )}
            {l.verified && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-primary px-2 py-1 text-xs font-bold text-white shadow-soft">
                <ShieldCheck className="h-3 w-3" /> {t("card.verified")}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-bold text-ink">{capitalize(l.crop)}</h3>
              <p className="truncate text-sm text-slate">
                {Number(l.quantity_kg)} kg{l.variety ? ` · ${l.variety}` : ""}
              </p>
            </div>
            <PriceChip amount={Number(l.offer_price ?? 0)} />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {l.expected_harvest_date ?? "TBD"}
            </span>
            {l.is_negotiable && <Badge tone="accent">{t("card.negotiable")}</Badge>}
          </div>

          <div className="flex items-center justify-between border-t border-mist pt-2.5">
            <span className="truncate text-sm font-semibold text-ink">
              {l.farmer?.full_name ?? "Farmer"}
            </span>
            {(l.farmer?.completed_deals ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate">
                <Star className="h-3.5 w-3.5 text-warning" fill="currentColor" />
                {stars.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
