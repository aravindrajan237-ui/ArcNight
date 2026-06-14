import { z } from "zod";

/** Shared primitives */
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const positive = z.number().positive();

// ---- Auth (username + password) ----
export const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,20}$/, "3–20 letters, numbers or underscore"),
  password: z.string().min(6, "At least 6 characters").max(72),
});
export type SignupInput = z.infer<typeof signupSchema>;

// ---- Onboarding / profile ----
export const onboardingSchema = z.object({
  role: z.enum(["farmer", "buyer"]),
  full_name: z.string().min(2).max(80),
  phone: z.string().min(8).max(20).optional(),
  language: z.enum(["en", "hi", "ta"]).default("en"),
  lat,
  lng,
  location_label: z.string().max(120).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ---- Listings ----
// Create a harvest_listings row (migration schema).
export const createListingSchema = z.object({
  crop: z.string().min(2).max(60),
  variety: z.string().max(60).optional(),
  quantity_kg: positive,
  offer_price: positive, // farmer's asking ₹/kg
  market_price: positive.optional(), // AI reference (from /api/price-estimate)
  expected_harvest_date: z.string().date(), // "YYYY-MM-DD"
  is_organic: z.boolean().default(false),
  is_negotiable: z.boolean().default(true),
  crop_photo_url: z.string().url().optional(),
  ai_quality_label: z.string().max(120).optional(),
  // Optional explicit location; defaults to the farmer's profile location.
  lat: lat.optional(),
  lng: lng.optional(),
  location_label: z.string().max(120).optional(),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

// GET /api/listings filters (parsed from query string → coerced)
export const listingFiltersSchema = z.object({
  crop: z.string().optional(),
  max_distance_km: z.coerce.number().positive().optional(),
  // Buyer's location, required only when filtering by distance.
  near_lat: z.coerce.number().min(-90).max(90).optional(),
  near_lng: z.coerce.number().min(-180).max(180).optional(),
  harvest_before: z.string().date().optional(),
  min_price: z.coerce.number().nonnegative().optional(),
  max_price: z.coerce.number().nonnegative().optional(),
  negotiable: z.coerce.boolean().optional(),
  organic: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListingFilters = z.infer<typeof listingFiltersSchema>;

// ---- Offers ----
export const createOfferSchema = z.object({
  listing_id: z.string().uuid(),
  proposed_price: positive, // ₹/kg the buyer offers
  proposed_qty_kg: positive,
  message: z.string().max(500).optional(),
});
export type CreateOfferInput = z.infer<typeof createOfferSchema>;

export const respondOfferSchema = z
  .object({
    action: z.enum(["accept", "reject", "counter"]),
    // Required only for `counter`.
    counter_price_per_kg: positive.optional(),
    counter_quantity_kg: positive.optional(),
    message: z.string().max(500).optional(),
  })
  .refine(
    (v) => v.action !== "counter" || v.counter_price_per_kg !== undefined,
    { message: "counter_price_per_kg is required when action is 'counter'" },
  );
export type RespondOfferInput = z.infer<typeof respondOfferSchema>;

// ---- Deals ----
export const createDealSchema = z.object({
  offer_id: z.string().uuid(),
  esign: z.literal(true, {
    errorMap: () => ({ message: "You must e-sign to create the agreement." }),
  }),
});
export type CreateDealInput = z.infer<typeof createDealSchema>;

// ---- Payments ----
export const paymentOrderSchema = z.object({
  deal_id: z.string().uuid(),
  kind: z.enum(["advance", "final"]).default("advance"),
});
export type PaymentOrderInput = z.infer<typeof paymentOrderSchema>;

export const paymentVerifySchema = z.object({
  deal_id: z.string().uuid(),
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});
export type PaymentVerifyInput = z.infer<typeof paymentVerifySchema>;

// ---- Messages ----
// Chat is scoped to a harvest listing (realtime channel key) and addressed to
// the counterparty. is_ai is set server-side, never by the client. A message
// carries text and/or a voice clip (audio_url).
export const createMessageSchema = z
  .object({
    listing_id: z.string().uuid(),
    receiver_id: z.string().uuid(),
    body: z.string().max(2000).optional(),
    audio_url: z.string().url().optional(),
    audio_duration_sec: z.number().nonnegative().max(600).optional(),
  })
  .refine((v) => (v.body && v.body.trim().length > 0) || v.audio_url, {
    message: "A message needs text or a voice clip.",
  });
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

// ---- Reviews ----
export const createReviewSchema = z.object({
  deal_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// ---- Reports (scam / abuse) ----
export const createReportSchema = z.object({
  reported_user_id: z.string().uuid().optional(),
  listing_id: z.string().uuid().optional(),
  deal_id: z.string().uuid().optional(),
  reason: z.enum([
    "fraud_scam",
    "fake_listing",
    "payment_issue",
    "abusive",
    "spam",
    "other",
  ]),
  description: z.string().max(1000).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;
