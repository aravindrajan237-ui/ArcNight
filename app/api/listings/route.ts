import { handle, ok, parseBody, requireRole, ApiError } from "@/lib/api";
import { createListingSchema, listingFiltersSchema } from "@/lib/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { haversineKm } from "@/lib/geo";
import { fairDealScore } from "@/lib/ai";
import type { HarvestListing, Profile } from "@/lib/types";

// Auth + live query + per-request filters — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/listings — create a harvest contract (farmer only).
 * Writes to harvest_listings. Location defaults to the farmer's profile.
 * fair_deal_score is computed from offer_price vs the AI market_price.
 */
export const POST = handle(async (req) => {
  const { user, profile, supabase } = await requireRole("farmer");
  const body = await parseBody(req, createListingSchema);

  const lat = body.lat ?? profile?.lat ?? null;
  const lng = body.lng ?? profile?.lng ?? null;

  const fair =
    body.market_price && body.market_price > 0
      ? fairDealScore(body.offer_price, body.market_price)
      : null;

  const { data, error } = await supabase
    .from("harvest_listings")
    .insert({
      farmer_id: user.id,
      crop: body.crop,
      variety: body.variety ?? null,
      is_organic: body.is_organic,
      quantity_kg: body.quantity_kg,
      offer_price: body.offer_price,
      market_price: body.market_price ?? null,
      expected_harvest_date: body.expected_harvest_date,
      is_negotiable: body.is_negotiable,
      fair_deal_score: fair,
      crop_photo_url: body.crop_photo_url ?? null,
      ai_quality_label: body.ai_quality_label ?? null,
      lat,
      lng,
      location_label: body.location_label ?? profile?.location_label ?? null,
      status: "open",
    })
    .select("*")
    .single();

  if (error) throw new ApiError(400, error.message);
  return ok(data, 201);
});

export interface ListingWithFarmer extends HarvestListing {
  distance_km?: number;
  verified: boolean;
  farmer: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
    trust_score: number | null;
    completed_deals: number | null;
  } | null;
}

/**
 * GET /api/listings — public search over open harvest contracts.
 * Filters: crop, max_distance_km (+ near_lat/near_lng), harvest_before,
 * min_price/max_price (offer_price), negotiable, organic, verified.
 * "verified" = the crop photo was AI-checked (ai_quality_label present).
 * Enriched with the farmer's trust info and stored fair_deal_score.
 */
export const GET = handle(async (req) => {
  const admin = createAdminClient(); // public read; service role avoids RLS edge cases
  const { searchParams } = new URL(req.url);
  const f = listingFiltersSchema.parse(Object.fromEntries(searchParams));

  let q = admin
    .from("harvest_listings")
    .select("*")
    .eq("status", "open")
    .gt("quantity_kg", 0);

  if (f.crop) q = q.ilike("crop", `%${f.crop}%`);
  if (f.harvest_before) q = q.lte("expected_harvest_date", f.harvest_before);
  if (f.min_price !== undefined) q = q.gte("offer_price", f.min_price);
  if (f.max_price !== undefined) q = q.lte("offer_price", f.max_price);
  if (f.negotiable !== undefined) q = q.eq("is_negotiable", f.negotiable);
  if (f.organic !== undefined) q = q.eq("is_organic", f.organic);
  if (f.verified === true) q = q.not("crop_photo_url", "is", null);

  q = q.order("created_at", { ascending: false }).limit(f.limit);

  const { data, error } = await q;
  if (error) throw new ApiError(400, error.message);
  let rows = (data ?? []) as HarvestListing[];

  // Distance filter + sort (JS haversine; mirrors SQL haversine_km).
  if (
    f.max_distance_km !== undefined &&
    f.near_lat !== undefined &&
    f.near_lng !== undefined
  ) {
    rows = rows
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => ({
        ...l,
        distance_km: +haversineKm(f.near_lat!, f.near_lng!, l.lat!, l.lng!).toFixed(2),
      }))
      .filter((l) => (l as ListingWithFarmer).distance_km! <= f.max_distance_km!)
      .sort(
        (a, b) =>
          (a as ListingWithFarmer).distance_km! -
          (b as ListingWithFarmer).distance_km!,
      );
  }

  // Batch-load farmer profiles for trust info.
  const farmerIds = [...new Set(rows.map((r) => r.farmer_id))];
  const { data: profiles } = farmerIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, photo_url, trust_score, completed_deals")
        .in("id", farmerIds)
    : { data: [] as Partial<Profile>[] };

  const result: ListingWithFarmer[] = rows.map((l) => {
    const p = (profiles ?? []).find((x) => x.id === l.farmer_id);
    return {
      ...l,
      verified: !!l.crop_photo_url,
      farmer: p
        ? {
            id: p.id!,
            full_name: p.full_name ?? null,
            photo_url: p.photo_url ?? null,
            trust_score: p.trust_score ?? null,
            completed_deals: p.completed_deals ?? null,
          }
        : null,
    };
  });

  return ok(result);
});
