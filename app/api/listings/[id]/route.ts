import { handle, ok, fail } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HarvestListing } from "@/lib/types";

// Reads live data per request — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * GET /api/listings/[id] — single public harvest contract enriched with the
 * farmer's trust info. fair_deal_score is read from the stored column.
 */
export const GET = handle(async (_req, { params }) => {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("harvest_listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data) return fail(404, "Listing not found");
  const listing = data as HarvestListing;

  const { data: farmer } = await admin
    .from("profiles")
    .select("id, full_name, photo_url, trust_score, completed_deals, on_time_rate")
    .eq("id", listing.farmer_id)
    .single();

  return ok({
    ...listing,
    verified: !!listing.ai_quality_label,
    farmer: farmer ?? null,
  });
});
