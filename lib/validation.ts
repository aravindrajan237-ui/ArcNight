import { z } from "zod";

/** Shared primitives */
const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const positive = z.number().positive();

// ---- Onboarding / profile ----
export const onboardingSchema = z.object({
  role: z.enum(["farmer", "buyer"]),
  full_name: z.string().min(2).max(80),
  phone: z.string().min(8).max(20).optional(),
  lat,
  lng,
  location_label: z.string().max(120).optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// ---- Listings ----
export const createListingSchema = z.object({
  crop: z.string().min(2).max(60),
  quantity_kg: positive,
  price_per_kg: positive,
  harvest_date: z.string().date(), // "YYYY-MM-DD"
  negotiable: z.boolean().default(true),
  organic: z.boolean().default(false),
  lat,
  lng,
  location_label: z.string().max(120).optional(),
  notes: z.string().max(1000).optional(),
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
  offer_price_per_kg: positive,
  quantity_kg: positive,
  message: z.string().max(500).optional(),
  // Set when this offer is a counter to a previous one.
  parent_offer_id: z.string().uuid().optional(),
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
// the counterparty. is_ai is set server-side, never by the client.
export const createMessageSchema = z.object({
  listing_id: z.string().uuid(),
  receiver_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

// ---- Reviews ----
export const createReviewSchema = z.object({
  deal_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
