import { handle, ok, fail } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { estimateMarketPrice, fairDealScore } from "@/lib/ai";
import type { Listing } from "@/lib/types";

// Reads live data + calls Gemini per request — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * GET /api/listings/[id] — single public contract, enriched with the AI market
 * estimate and fair_deal_score.
 */
export const GET = handle(async (_req, { params }) => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) return fail(404, "Listing not found");

  const listing = data as Listing;
  const estimate = await estimateMarketPrice({
    crop: listing.crop,
    locationLabel: listing.location_label,
    askingPricePerKg: listing.price_per_kg,
  });

  return ok({
    ...listing,
    market_estimate_per_kg: estimate.estimate_per_kg,
    market_estimate_low: estimate.low_per_kg,
    market_estimate_high: estimate.high_per_kg,
    fair_deal_score: fairDealScore(listing.price_per_kg, estimate.estimate_per_kg),
  });
});
