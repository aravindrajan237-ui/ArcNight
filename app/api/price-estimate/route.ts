import { handle, ok, fail } from "@/lib/api";
import { estimatePrice } from "@/lib/pricing";
import { getLocale } from "@/lib/i18n/server";

// Reads live history + may call data.gov.in — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * GET /api/price-estimate?crop=tomato&region=Maharashtra
 *
 * Returns the explainable ~4-week price forecast { estimate, low, high, basis }.
 * The Create-Listing screen calls this to pre-fill market_price.
 */
export const GET = handle(async (req) => {
  const { searchParams } = new URL(req.url);
  const crop = searchParams.get("crop")?.trim();
  const region = searchParams.get("region")?.trim();

  if (!crop || !region) {
    return fail(400, "Both `crop` and `region` query params are required.");
  }

  const estimate = await estimatePrice(crop, region, getLocale());
  return ok(estimate);
});
