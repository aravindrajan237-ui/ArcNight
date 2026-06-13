/**
 * Hand-written subset of the Supabase DB types. For a hackathon this is enough
 * and keeps route handlers honest. To regenerate the full typed schema later:
 *   npx supabase gen types typescript --project-id <ref> > lib/types.ts
 */

export type Role = "farmer" | "buyer";
export type ListingStatus = "open" | "in_negotiation" | "closed";
export type OfferStatus = "pending" | "accepted" | "rejected" | "countered";
// Union of the original scaffold statuses and the migration-era statuses so the
// one `deals` type satisfies both old and new routes.
export type DealStatus =
  | "created"
  | "awaiting_advance"
  | "advance_paid"
  | "fulfilled"
  | "cancelled";

export type PaymentType = "advance" | "final";
export type PaymentStatus = "created" | "paid" | "failed";

// NOTE: these are `type` aliases (not `interface`) on purpose — supabase-js's
// GenericTable requires each Row to be assignable to Record<string, unknown>,
// which interfaces don't satisfy (no implicit index signature). Using `type`
// keeps the typed client from collapsing query results to `never`.
export type Profile = {
  id: string; // == auth.users.id
  role: Role | null;
  full_name: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  location_label: string | null;
  created_at: string;
};

export type Listing = {
  id: string;
  farmer_id: string;
  crop: string;
  quantity_kg: number;
  price_per_kg: number; // farmer's asking price (₹/kg)
  harvest_date: string; // ISO date
  negotiable: boolean;
  organic: boolean;
  verified: boolean;
  lat: number;
  lng: number;
  location_label: string | null;
  notes: string | null;
  status: ListingStatus;
  created_at: string;
};

export type Offer = {
  id: string;
  listing_id: string;
  buyer_id: string;
  // migration-era columns (offers table in 0001_init.sql)
  farmer_id: string;
  proposed_price: number;
  proposed_qty_kg: number;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  // --- original scaffold columns, kept so the old offer routes still compile ---
  offer_price_per_kg?: number;
  quantity_kg?: number;
  parent_offer_id?: string | null;
};

export type Deal = {
  id: string;
  listing_id: string;
  farmer_id: string;
  buyer_id: string;
  // migration-era columns (deals table in 0001_init.sql)
  final_price: number; // agreed ₹/kg
  final_qty_kg: number;
  total_amount: number; // final_price * final_qty_kg
  advance_amount: number; // 15% of total
  advance_paid: boolean;
  status: DealStatus;
  agreement_pdf_url: string | null;
  created_at: string;
  // --- original scaffold columns, kept so old routes (leaderboard, reviews) compile ---
  // crop/quantity_kg stay required because the leaderboard route keys a Map on them.
  crop: string;
  quantity_kg: number;
  offer_id?: string;
  agreed_price_per_kg?: number;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  esign_farmer?: boolean;
  esign_buyer?: boolean;
};

export type Payment = {
  id: string;
  deal_id: string;
  payer_id: string;
  amount: number;
  type: PaymentType;
  provider: "razorpay";
  provider_order_id: string | null;
  provider_payment_id: string | null;
  status: PaymentStatus;
  created_at: string;
};

export type Message = {
  id: string;
  // `deal_id` is from the original scaffold; the migration-era schema scopes
  // chat to a listing with an explicit receiver + AI flag. Both are kept here
  // (nullable) so the original /api/messages route and the new AI features
  // compile against one superset type.
  deal_id: string | null;
  listing_id: string | null;
  sender_id: string;
  receiver_id: string | null;
  body: string;
  is_ai: boolean;
  created_at: string;
};

// ---- migration-era tables (0001_init.sql) used by the AI features ----

export type HarvestListingStatus =
  | "open"
  | "reserved"
  | "paid"
  | "fulfilled"
  | "cancelled";

export type HarvestListing = {
  id: string;
  farm_id: string | null;
  farmer_id: string;
  crop: string;
  variety: string | null;
  is_organic: boolean;
  quantity_kg: number;
  expected_harvest_date: string | null;
  market_price: number | null; // AI/mandi reference ₹/kg
  offer_price: number | null; // farmer's asking ₹/kg
  is_negotiable: boolean;
  fair_deal_score: number | null;
  status: HarvestListingStatus;
  crop_photo_url: string | null;
  ai_quality_label: string | null;
  created_at: string;
};

export type PriceHistory = {
  id: string;
  crop: string;
  region: string;
  price_per_kg: number;
  recorded_on: string; // ISO date
};

export type Review = {
  id: string;
  deal_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number; // 1..5
  comment: string | null;
  created_at: string;
};

// Minimal generic shape so the typed clients compile. Expand as needed.
type Row<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Row<Profile>;
      listings: Row<Listing>;
      offers: Row<Offer>;
      deals: Row<Deal>;
      messages: Row<Message>;
      reviews: Row<Review>;
      // migration-era tables used by the AI features
      harvest_listings: Row<HarvestListing>;
      price_history: Row<PriceHistory>;
      payments: Row<Payment>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
