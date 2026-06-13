import { createClient } from "@/lib/supabase/server";
import { estimateMarketPrice, fairDealScore } from "@/lib/ai";
import { FairnessBadge } from "@/components/FairnessBadge";
import type { Listing } from "@/lib/types";

/**
 * Buyer dashboard. Server Component — lists open harvests with a fair-deal
 * score. Full filtering (crop, distance, price, organic…) is served by
 * GET /api/listings; this page renders the latest open listings as a starting
 * point that you can wire the filter UI + Leaflet map onto next.
 */
export default async function BuyerDashboard() {
  const supabase = createClient();

  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);

  const listings = (data ?? []) as Listing[];

  const enriched = await Promise.all(
    listings.map(async (l) => {
      const est = await estimateMarketPrice({
        crop: l.crop,
        locationLabel: l.location_label,
        askingPricePerKg: l.price_per_kg,
      });
      return { l, score: fairDealScore(l.price_per_kg, est.estimate_per_kg) };
    }),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Browse harvests</h1>
        <p className="text-sm text-zinc-600">
          Make a fair offer directly to the farmer. We never take a cut.
        </p>
      </header>

      {enriched.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
          No open harvests right now. Filter with{" "}
          <code className="rounded bg-zinc-100 px-1">GET /api/listings</code>.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {enriched.map(({ l, score }) => (
            <li key={l.id} className="rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold capitalize">{l.crop}</h3>
                <span className="text-sm font-semibold text-harvest-600">
                  ₹{l.price_per_kg}/kg
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                {l.quantity_kg} kg · harvest {l.harvest_date}
                {l.location_label ? ` · ${l.location_label}` : ""}
              </p>
              <div className="mt-3">
                <FairnessBadge score={score} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
