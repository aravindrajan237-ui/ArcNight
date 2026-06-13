import { createAdminClient } from "@/lib/supabase/admin";

/**
 * HarvestLink pricing engine (A).
 *
 * Forecasts a fair farm-gate price ~4 weeks out for a crop+region using an
 * EXPLAINABLE method (no black box):
 *   1. 7-day moving average of recent prices  → smooths daily noise
 *   2. least-squares linear trend over time   → projects the slope forward
 * The forecast blends the two, and the {low, high} band widens with how noisy
 * the history is (residual spread of the fit).
 *
 * Data source priority:
 *   1. price_history rows for the crop+region
 *   2. if history is thin (< MIN_POINTS), fall back to the data.gov.in
 *      Agmarknet API, then persist the fetched points back into price_history
 *      so subsequent calls are local + fast.
 *
 * Every external call (Supabase, data.gov.in) is wrapped so failures degrade
 * gracefully and never throw to the caller.
 */

const MIN_POINTS = 4; // below this, history is "thin" → try data.gov.in
const FORECAST_DAYS = 28; // ~4 weeks out

export interface PriceEstimate {
  crop: string;
  region: string;
  estimate: number; // ₹/kg forecast
  low: number; // ₹/kg lower bound
  high: number; // ₹/kg upper bound
  basis: string; // human-readable explanation
  points_used: number;
  source: "history" | "agmarknet" | "none";
}

interface Point {
  t: number; // days since epoch (x)
  price: number; // ₹/kg (y)
}

/** Public entrypoint used by GET /api/price-estimate and the listing screen. */
export async function estimatePrice(
  crop: string,
  region: string,
): Promise<PriceEstimate> {
  const cropKey = crop.trim().toLowerCase();
  const regionKey = region.trim();

  let points = await loadHistory(cropKey, regionKey);
  let source: PriceEstimate["source"] = points.length ? "history" : "none";

  // Thin history → top up from data.gov.in Agmarknet, persist, and reload.
  if (points.length < MIN_POINTS) {
    const fetched = await fetchAgmarknet(cropKey, regionKey);
    if (fetched.length) {
      await persistPoints(cropKey, regionKey, fetched);
      points = await loadHistory(cropKey, regionKey);
      source = "agmarknet";
    }
  }

  if (points.length === 0) {
    return {
      crop: cropKey,
      region: regionKey,
      estimate: 0,
      low: 0,
      high: 0,
      basis: "No price history available for this crop and region yet.",
      points_used: 0,
      source: "none",
    };
  }

  return forecast(cropKey, regionKey, points, source);
}

// ---------------------------------------------------------------------------
// Core math (pure, testable, explainable)
// ---------------------------------------------------------------------------

function forecast(
  crop: string,
  region: string,
  pointsIn: Point[],
  source: PriceEstimate["source"],
): PriceEstimate {
  // Sort ascending by time.
  const points = [...pointsIn].sort((a, b) => a.t - b.t);
  const n = points.length;

  // 1) 7-day moving average of the most recent window.
  const recent = points.slice(-7);
  const movingAvg =
    recent.reduce((s, p) => s + p.price, 0) / recent.length;

  // 2) Least-squares linear trend: price = m*t + b.
  const { m, b, residualStd } = leastSquares(points);

  // Project the fit FORECAST_DAYS beyond the latest observation.
  const lastT = points[n - 1].t;
  const targetT = lastT + FORECAST_DAYS;
  const trendForecast = m * targetT + b;

  // Blend: trust the trend, but anchor to the moving average so a short noisy
  // series can't produce an absurd extrapolation. 60/40 trend/MA.
  let estimate =
    Number.isFinite(trendForecast) && n >= 2
      ? 0.6 * trendForecast + 0.4 * movingAvg
      : movingAvg;
  estimate = Math.max(1, estimate); // never ≤ 0

  // Band: ±(1 std of fit residuals), floored to ±8% so it's never zero-width.
  const spread = Math.max(residualStd, estimate * 0.08);
  const low = Math.max(1, estimate - spread);
  const high = estimate + spread;

  const slopePerWeek = m * 7;
  const direction =
    Math.abs(slopePerWeek) < 0.05
      ? "flat"
      : slopePerWeek > 0
        ? `rising ~₹${slopePerWeek.toFixed(1)}/kg per week`
        : `falling ~₹${Math.abs(slopePerWeek).toFixed(1)}/kg per week`;

  return {
    crop,
    region,
    estimate: round2(estimate),
    low: round2(low),
    high: round2(high),
    basis:
      `7-day moving average ₹${round2(movingAvg)}/kg blended with a ` +
      `least-squares trend (${direction}) projected ${FORECAST_DAYS} days out, ` +
      `using ${n} price point${n === 1 ? "" : "s"} (${source}).`,
    points_used: n,
    source,
  };
}

/** Ordinary least squares for y = m*x + b, plus residual std-dev. */
function leastSquares(points: Point[]): {
  m: number;
  b: number;
  residualStd: number;
} {
  const n = points.length;
  if (n < 2) {
    return { m: 0, b: points[0]?.price ?? 0, residualStd: 0 };
  }
  // Normalise x to keep numbers small (days since first point).
  const x0 = points[0].t;
  const xs = points.map((p) => p.t - x0);
  const ys = points.map((p) => p.price);

  const sumX = xs.reduce((s, v) => s + v, 0);
  const sumY = ys.reduce((s, v) => s + v, 0);
  const sumXY = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const sumXX = xs.reduce((s, v) => s + v * v, 0);

  const denom = n * sumXX - sumX * sumX;
  const m = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const bNorm = (sumY - m * sumX) / n;

  // Residual standard deviation of the fit.
  const residuals = ys.map((y, i) => y - (m * xs[i] + bNorm));
  const residualStd = Math.sqrt(
    residuals.reduce((s, r) => s + r * r, 0) / n,
  );

  // Convert intercept back to the original x scale: b = bNorm - m*x0.
  return { m, b: bNorm - m * x0, residualStd };
}

const round2 = (v: number) => +v.toFixed(2);
const dayNumber = (iso: string) =>
  Math.floor(new Date(iso).getTime() / 86_400_000);

// ---------------------------------------------------------------------------
// Data access (all failures swallowed → return empty / no-op)
// ---------------------------------------------------------------------------

async function loadHistory(crop: string, region: string): Promise<Point[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("price_history")
      .select("price_per_kg, recorded_on")
      .eq("crop", crop)
      .eq("region", region)
      .order("recorded_on", { ascending: true });

    if (error || !data) return [];
    return data
      .filter((r) => r.price_per_kg != null && r.recorded_on)
      .map((r) => ({
        t: dayNumber(r.recorded_on as string),
        price: Number(r.price_per_kg),
      }));
  } catch (err) {
    console.error("[pricing] loadHistory failed:", err);
    return [];
  }
}

async function persistPoints(
  crop: string,
  region: string,
  points: { price: number; recorded_on: string }[],
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("price_history").insert(
      points.map((p) => ({
        crop,
        region,
        price_per_kg: p.price,
        recorded_on: p.recorded_on,
      })),
    );
  } catch (err) {
    console.error("[pricing] persistPoints failed:", err);
  }
}

/**
 * data.gov.in Agmarknet "Current Daily Price of Various Commodities" resource.
 * Free tier; needs DATA_GOV_IN_API_KEY. Returns [] on any failure so the engine
 * just keeps whatever local history it has.
 */
async function fetchAgmarknet(
  crop: string,
  region: string,
): Promise<{ price: number; recorded_on: string }[]> {
  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (!apiKey) return [];

  // Agmarknet daily prices resource id (commodity-wise mandi prices).
  const resource = "9ef84268-d588-465a-a308-a864a43d0070";
  const url = new URL(`https://api.data.gov.in/resource/${resource}`);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "100");
  // Title-case the crop for Agmarknet's "commodity" field (e.g. "Tomato").
  url.searchParams.set(
    "filters[commodity]",
    crop.charAt(0).toUpperCase() + crop.slice(1),
  );
  url.searchParams.set("filters[state]", region);

  try {
    const res = await fetch(url, {
      // Don't let a slow upstream hang the request.
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      records?: Array<{
        modal_price?: string;
        arrival_date?: string;
      }>;
    };

    const out: { price: number; recorded_on: string }[] = [];
    for (const rec of json.records ?? []) {
      // Agmarknet modal_price is ₹/quintal → ÷100 for ₹/kg.
      const perQuintal = Number(rec.modal_price);
      if (!Number.isFinite(perQuintal) || perQuintal <= 0) continue;
      const date = parseAgmarknetDate(rec.arrival_date);
      if (!date) continue;
      out.push({ price: round2(perQuintal / 100), recorded_on: date });
    }
    return out;
  } catch (err) {
    console.error("[pricing] fetchAgmarknet failed:", err);
    return [];
  }
}

/** Agmarknet dates arrive as DD/MM/YYYY; normalise to YYYY-MM-DD. */
function parseAgmarknetDate(raw?: string): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}
