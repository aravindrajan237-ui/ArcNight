import Link from "next/link";
import { Receipt, Sprout, ChevronRight } from "lucide-react";
import { getMe } from "@/lib/session";
import {
  AppBar,
  Card,
  StatusPill,
  PriceChip,
  PrimaryButton,
  EmptyState,
  type ListingStatus,
} from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import type { Deal, HarvestListing } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEAL_TO_PILL: Record<string, ListingStatus> = {
  awaiting_advance: "reserved",
  advance_paid: "paid",
  fulfilled: "fulfilled",
  cancelled: "cancelled",
};

export default async function BuyerOrders() {
  const t = getT();
  const { supabase, user } = await getMe();

  const { data: dealRows } = await supabase
    .from("deals")
    .select("*")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });
  const deals = (dealRows ?? []) as Deal[];

  const listingIds = [...new Set(deals.map((d) => d.listing_id))];
  const { data: listings } = listingIds.length
    ? await supabase
        .from("harvest_listings")
        .select("id, crop, crop_photo_url")
        .in("id", listingIds)
    : { data: [] as Pick<HarvestListing, "id" | "crop" | "crop_photo_url">[] };
  const listingOf = (id: string) => listings?.find((l) => l.id === id);

  return (
    <div>
      <AppBar title={t("orders.title")} />
      <main className="mx-auto max-w-2xl px-4 pb-12 pt-6 sm:px-6">
        {deals.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-7 w-7" />}
            title={t("orders.empty")}
            description={t("orders.emptySub")}
            action={
              <Link href="/buyer">
                <PrimaryButton>{t("cart.browse")}</PrimaryButton>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {deals.map((d) => {
              const li = listingOf(d.listing_id);
              const total = Number(d.total_amount);
              // CTA hint mirrors the next action on the tracking page.
              const cta =
                d.status === "awaiting_advance"
                  ? t("act.payAdvance")
                  : d.status === "advance_paid"
                    ? t("track.payBalance")
                    : t("track.viewStatus");
              return (
                <Link key={d.id} href={`/buyer/orders/${d.id}`}>
                  <Card interactive inset>
                    <div className="flex items-center gap-3">
                      {li?.crop_photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={li.crop_photo_url} alt={li.crop} className="h-14 w-14 rounded-xl object-cover" />
                      ) : (
                        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 text-primary">
                          <Sprout className="h-6 w-6" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold capitalize text-ink">{li?.crop ?? "Harvest"}</p>
                        <p className="text-sm text-slate">
                          {Number(d.final_qty_kg)} kg · ₹{Number(d.final_price)}/kg
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <StatusPill status={DEAL_TO_PILL[d.status] ?? "reserved"} size="sm" />
                        <PriceChip amount={total} size="sm" />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-mist pt-2.5">
                      <span className="text-sm font-semibold text-primary">{cta}</span>
                      <ChevronRight className="h-4 w-4 text-slate" />
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
