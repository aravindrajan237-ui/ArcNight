import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * AI fairness layer.
 *
 * `estimateMarketPrice` asks Gemini for a fair ₹/kg market estimate for a crop
 * in a region. `fairDealScore` then scores how close an agreed/offered price is
 * to that estimate. This is the visible "fair deal" differentiator — there is
 * NO commission or fee math anywhere in the platform.
 */

export interface MarketEstimate {
  crop: string;
  estimate_per_kg: number;
  low_per_kg: number;
  high_per_kg: number;
  source: "gemini" | "fallback";
  rationale?: string;
}

const client = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

/** Default model for all HarvestLink AI features (free tier). */
export const GEMINI_MODEL = "gemini-2.5-flash";

/** Shared Gemini client — null when GEMINI_API_KEY is unset. */
export function getGenAI(): GoogleGenerativeAI | null {
  return client;
}

/**
 * Convenience accessor that returns a configured model, reusing the single
 * shared client above. Returns null if no API key is configured so callers can
 * fall back gracefully instead of crashing.
 */
export function getGeminiModel(opts?: {
  json?: boolean;
  model?: string;
}) {
  if (!client) return null;
  return client.getGenerativeModel({
    model: opts?.model ?? GEMINI_MODEL,
    ...(opts?.json
      ? { generationConfig: { responseMimeType: "application/json" } }
      : {}),
  });
}

/**
 * Ask Gemini for a fair market price band for a crop near a location.
 * Falls back to a neutral band around the asking price if the key is missing
 * or the model returns something unparseable — so the app never hard-fails.
 */
export async function estimateMarketPrice(params: {
  crop: string;
  locationLabel?: string | null;
  askingPricePerKg?: number;
}): Promise<MarketEstimate> {
  const { crop, locationLabel, askingPricePerKg } = params;

  const fallback = (): MarketEstimate => {
    const base = askingPricePerKg ?? 0;
    return {
      crop,
      estimate_per_kg: base,
      low_per_kg: +(base * 0.85).toFixed(2),
      high_per_kg: +(base * 1.15).toFixed(2),
      source: "fallback",
      rationale: "Gemini unavailable — neutral band around asking price.",
    };
  };

  if (!client) return fallback();

  try {
    const model = client.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `You are an agricultural mandi price expert for India.
Give a FAIR farm-gate wholesale price for the crop below in INR per kg.
Crop: ${crop}
Region: ${locationLabel ?? "India (national average)"}
Respond ONLY as JSON with numeric fields:
{"estimate_per_kg": number, "low_per_kg": number, "high_per_kg": number, "rationale": string}`;

    const res = await model.generateContent(prompt);
    const parsed = JSON.parse(res.response.text());

    const estimate = Number(parsed.estimate_per_kg);
    if (!Number.isFinite(estimate) || estimate <= 0) return fallback();

    return {
      crop,
      estimate_per_kg: +estimate.toFixed(2),
      low_per_kg: +Number(parsed.low_per_kg ?? estimate * 0.85).toFixed(2),
      high_per_kg: +Number(parsed.high_per_kg ?? estimate * 1.15).toFixed(2),
      source: "gemini",
      rationale: typeof parsed.rationale === "string" ? parsed.rationale : undefined,
    };
  } catch {
    return fallback();
  }
}

/**
 * fair_deal_score (0–100): how close a price is to the AI market estimate.
 * 100 = exactly at the fair estimate; the score decays linearly with the
 * percentage deviation and is capped at 0. A ±50% deviation scores 0.
 */
export function fairDealScore(pricePerKg: number, estimatePerKg: number): number {
  if (!Number.isFinite(estimatePerKg) || estimatePerKg <= 0) return 0;
  const deviation = Math.abs(pricePerKg - estimatePerKg) / estimatePerKg;
  const score = 100 * (1 - deviation / 0.5); // 0% dev → 100, 50% dev → 0
  return Math.max(0, Math.min(100, Math.round(score)));
}
