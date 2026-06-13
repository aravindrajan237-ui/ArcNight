import { handle, ok, parseBody, requireRole } from "@/lib/api";
import {
  createListingSchema,
  listingFiltersSchema,
} from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import { haversineKm } from "@/lib/geo";
import { estimateMarketPrice, fairDealScore } from "@/lib/ai";
import type { Listing } from "@/lib/types";

// Auth + live query + per-request filters — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * POST /api/listings — create a harvest contract (farmer only).
 */
export const POST = handle(async (req) => {
  const { supabase, user } = await requireRole("farmer");
  const body = await parseBody(req, createListingSchema);

  const { data, error } = await supabase
    .from("listings")
    .insert({
      farmer_id: user.id,
      crop: body.crop,
      quantity_kg: body.quantity_kg,
      price_per_kg: body.price_per_kg,
      harvest_date: body.harvest_date,
      negotiable: body.negotiable,
      organic: body.organic,
      lat: body.lat,
      lng: body.lng,
      location_label: body.location_label ?? null,
      notes: body.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return ok(data, 201);
});

/**
 * GET /api/listings — search/filter open listings.
 * Filters: crop, max_distance_km (+ near_lat/near_lng), harvest_before,
 * min_price, max_price, negotiable, organic, verified.
 * Distance is computed with haversineKm. Each result is enriched with a
 * fair_deal_score against the AI market estimate.
 */
export const GET = handle(async (req) => {
  // Listings are public — a plain server client (anon key, RLS read) is enough.
  const supabase = createClient();

  const { searchParams } = new URL(req.url);
  const f = listingFiltersSchema.parse(Object.fromEntries(searchParams));

  let query = supabase.from("listings").select("*").eq("status", "open");

  if (f.crop) query = query.ilike("crop", `%${f.crop}%`);
  if (f.harvest_before) query = query.lte("harvest_date", f.harvest_before);
  if (f.min_price !== undefined) query = query.gte("price_per_kg", f.min_price);
  if (f.max_price !== undefined) query = query.lte("price_per_kg", f.max_price);
  if (f.negotiable !== undefined) query = query.eq("negotiable", f.negotiable);
  if (f.organic !== undefined) query = query.eq("organic", f.organic);
  if (f.verified !== undefined) query = query.eq("verified", f.verified);

  query = query.order("created_at", { ascending: false }).limit(f.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (data ?? []) as Listing[];

  // Distance filter (computed in JS via haversineKm; mirrors haversine_km SQL).
  if (
    f.max_distance_km !== undefined &&
    f.near_lat !== undefined &&
    f.near_lng !== undefined
  ) {
    rows = rows
      .map((l) => ({
        l,
        distance_km: haversineKm(f.near_lat!, f.near_lng!, l.lat, l.lng),
      }))
      .filter((r) => r.distance_km <= f.max_distance_km!)
      .sort((a, b) => a.distance_km - b.distance_km)
      .map((r) => Object.assign(r.l, { distance_km: +r.distance_km.toFixed(2) }));
  }

  // Enrich with fair_deal_score (AI market estimate vs farmer's asking price).
  const enriched = await Promise.all(
    rows.map(async (l) => {
      const estimate = await estimateMarketPrice({
        crop: l.crop,
        locationLabel: l.location_label,
        askingPricePerKg: l.price_per_kg,
      });
      return {
        ...l,
        market_estimate_per_kg: estimate.estimate_per_kg,
        fair_deal_score: fairDealScore(l.price_per_kg, estimate.estimate_per_kg),
      };
    }),
  );

  return ok(enriched);
});
