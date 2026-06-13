-- supabase/migrations/0001_init.sql
-- ============================================================================
-- HarvestLink — initial schema (UUID PKs, timestamptz, FK ON DELETE CASCADE)
-- Tables: profiles, farms, harvest_listings, offers, deals, payments,
--         messages, reviews, price_history
-- Plus: RLS policies, indexes, haversine_km() distance function, and a
--       new-user → profiles trigger (onboarding updates this row).
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ============================================================================
-- haversine_km(lat1, lng1, lat2, lng2) -> great-circle distance in km
-- Used by listing/farm distance filters. IMMUTABLE so it can sit in indexes
-- and WHERE clauses cheaply.
-- ============================================================================
create or replace function haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe as $$
  select 6371 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians(lng2 - lng1) / 2) ^ 2
  ));
$$;

-- ============================================================================
-- 1. profiles  (id = auth.users uid)
-- ============================================================================
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            text check (role in ('farmer', 'buyer', 'admin')),
  full_name       text,
  phone           text,
  photo_url       text,
  language        text not null default 'en' check (language in ('en', 'hi', 'ta')),
  lat             double precision,
  lng             double precision,
  trust_score     numeric not null default 0,        -- 0-100 reputation
  completed_deals integer not null default 0,
  on_time_rate    numeric not null default 0,        -- 0-100 (%) fulfilled on time
  created_at      timestamptz not null default now()
);

-- ============================================================================
-- 2. farms
-- ============================================================================
create table farms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  name        text not null,
  description text,
  lat         double precision,
  lng         double precision,
  address     text,
  is_verified boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 3. harvest_listings
-- ============================================================================
create table harvest_listings (
  id                    uuid primary key default gen_random_uuid(),
  farm_id               uuid references farms(id) on delete cascade,
  farmer_id             uuid not null references profiles(id) on delete cascade,
  crop                  text not null,
  variety               text,
  is_organic            boolean not null default false,
  quantity_kg           numeric not null check (quantity_kg > 0),
  expected_harvest_date date,
  market_price          numeric,                     -- AI/mandi reference ₹/kg
  offer_price           numeric,                     -- farmer's asking ₹/kg
  is_negotiable         boolean not null default true,
  fair_deal_score       integer check (fair_deal_score between 0 and 100),
  status                text not null default 'open'
                          check (status in ('open','reserved','paid','fulfilled','cancelled')),
  crop_photo_url        text,
  ai_quality_label      text,
  -- location of the harvest (defaults to the farmer's profile location on create);
  -- enables map pins + haversine distance filters without a farms join
  lat                   double precision,
  lng                   double precision,
  location_label        text,
  created_at            timestamptz not null default now()
);

-- ============================================================================
-- 4. offers
-- ============================================================================
create table offers (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references harvest_listings(id) on delete cascade,
  buyer_id       uuid not null references profiles(id) on delete cascade,
  farmer_id      uuid not null references profiles(id) on delete cascade,
  proposed_price numeric not null,
  proposed_qty_kg numeric not null,
  message        text,
  status         text not null default 'pending'
                   check (status in ('pending','accepted','rejected','countered')),
  created_at     timestamptz not null default now()
);

-- ============================================================================
-- 5. deals
-- ============================================================================
create table deals (
  id                uuid primary key default gen_random_uuid(),
  listing_id        uuid not null references harvest_listings(id) on delete cascade,
  farmer_id         uuid not null references profiles(id) on delete cascade,
  buyer_id          uuid not null references profiles(id) on delete cascade,
  final_price       numeric not null,
  final_qty_kg      numeric not null,
  total_amount      numeric not null,
  advance_amount    numeric not null,
  advance_paid      boolean not null default false,
  status            text not null default 'awaiting_advance'
                      check (status in ('awaiting_advance','advance_paid','fulfilled','cancelled')),
  agreement_pdf_url text,
  created_at        timestamptz not null default now()
);

-- ============================================================================
-- 6. payments
-- ============================================================================
create table payments (
  id                uuid primary key default gen_random_uuid(),
  deal_id           uuid not null references deals(id) on delete cascade,
  payer_id          uuid not null references profiles(id) on delete cascade,
  amount            numeric not null,
  type              text not null check (type in ('advance','final')),
  provider          text not null default 'razorpay' check (provider in ('razorpay')),
  provider_order_id   text,
  provider_payment_id text,
  status            text not null default 'created' check (status in ('created','paid','failed')),
  created_at        timestamptz not null default now()
);

-- ============================================================================
-- 7. messages
-- ============================================================================
create table messages (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references harvest_listings(id) on delete cascade,
  sender_id   uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  body        text not null,
  is_ai       boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- 8. reviews  (one per deal per reviewer)
-- ============================================================================
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid not null references profiles(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (deal_id, reviewer_id)
);

-- ============================================================================
-- 9. price_history  (seed reference data the AI pricing engine reads)
-- ============================================================================
create table price_history (
  id           uuid primary key default gen_random_uuid(),
  crop         text not null,
  region       text not null,
  price_per_kg numeric not null,
  recorded_on  date not null
);

-- ============================================================================
-- Indexes  (crop, status, lat/lng, created_at + FK lookups)
-- ============================================================================
create index profiles_geo_idx          on profiles (lat, lng);

create index farms_owner_idx           on farms (owner_id);
create index farms_geo_idx             on farms (lat, lng);

create index listings_crop_idx         on harvest_listings (crop);
create index listings_status_idx       on harvest_listings (status);
create index listings_geo_idx          on harvest_listings (lat, lng);
create index listings_created_idx      on harvest_listings (created_at desc);
create index listings_farmer_idx       on harvest_listings (farmer_id);
create index listings_farm_idx         on harvest_listings (farm_id);

create index offers_listing_idx        on offers (listing_id);
create index offers_status_idx         on offers (status);
create index offers_buyer_idx          on offers (buyer_id);
create index offers_farmer_idx         on offers (farmer_id);
create index offers_created_idx        on offers (created_at desc);

create index deals_listing_idx         on deals (listing_id);
create index deals_farmer_idx          on deals (farmer_id);
create index deals_buyer_idx           on deals (buyer_id);
create index deals_status_idx          on deals (status);

create index payments_deal_idx         on payments (deal_id);
create index payments_status_idx       on payments (status);

create index messages_listing_idx      on messages (listing_id);
create index messages_created_idx      on messages (created_at desc);
create index messages_sender_idx       on messages (sender_id);
create index messages_receiver_idx     on messages (receiver_id);

create index reviews_deal_idx          on reviews (deal_id);
create index reviews_reviewee_idx      on reviews (reviewee_id);

create index price_history_crop_idx    on price_history (crop);
create index price_history_region_idx  on price_history (region);
create index price_history_recorded_idx on price_history (recorded_on desc);
create index price_history_crop_region_idx on price_history (crop, region);

-- Note: harvest_listings/farms/profiles have no lat/lng column-level geo index
-- that helps haversine math directly; the (lat,lng) btree above narrows coarse
-- bounding-box prefilters. For large datasets switch to PostGIS + GiST.

-- ============================================================================
-- new auth user -> profiles row (onboarding later fills role/name/location)
-- ============================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- Row Level Security
--   service-role connections bypass RLS entirely; these policies govern
--   anon/authenticated (client) access only.
-- ============================================================================
alter table profiles         enable row level security;
alter table farms            enable row level security;
alter table harvest_listings enable row level security;
alter table offers           enable row level security;
alter table deals            enable row level security;
alter table payments         enable row level security;
alter table messages         enable row level security;
alter table reviews          enable row level security;
alter table price_history    enable row level security;

-- ---- profiles: readable by all; writable only by self ----
create policy profiles_select_all on profiles
  for select using (true);
create policy profiles_insert_self on profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_self on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- farms: public read; write only by the owner farmer ----
create policy farms_select_all on farms
  for select using (true);
create policy farms_insert_owner on farms
  for insert with check (auth.uid() = owner_id);
create policy farms_update_owner on farms
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy farms_delete_owner on farms
  for delete using (auth.uid() = owner_id);

-- ---- harvest_listings: public read; write only by the owner farmer ----
create policy listings_select_all on harvest_listings
  for select using (true);
create policy listings_insert_owner on harvest_listings
  for insert with check (auth.uid() = farmer_id);
create policy listings_update_owner on harvest_listings
  for update using (auth.uid() = farmer_id) with check (auth.uid() = farmer_id);
create policy listings_delete_owner on harvest_listings
  for delete using (auth.uid() = farmer_id);

-- ---- offers: only the two parties (buyer + farmer) ----
create policy offers_select_parties on offers
  for select using (auth.uid() in (buyer_id, farmer_id));
create policy offers_insert_parties on offers
  for insert with check (auth.uid() in (buyer_id, farmer_id));
create policy offers_update_parties on offers
  for update using (auth.uid() in (buyer_id, farmer_id))
  with check (auth.uid() in (buyer_id, farmer_id));

-- ---- messages: only sender + receiver ----
create policy messages_select_parties on messages
  for select using (auth.uid() in (sender_id, receiver_id));
create policy messages_insert_sender on messages
  for insert with check (auth.uid() = sender_id);

-- ---- deals: parties can READ; all writes go through the service role ----
create policy deals_select_parties on deals
  for select using (auth.uid() in (farmer_id, buyer_id));

-- ---- payments: parties can READ; all writes go through the service role ----
create policy payments_select_parties on payments
  for select using (
    auth.uid() = payer_id
    or exists (
      select 1 from deals d
      where d.id = payments.deal_id
        and auth.uid() in (d.farmer_id, d.buyer_id)
    )
  );

-- ---- reviews: public read; one per deal, written by a deal participant
--      about the counterparty (uniqueness enforced by the unique constraint) --
create policy reviews_select_all on reviews
  for select using (true);
create policy reviews_insert_participant on reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from deals d
      where d.id = reviews.deal_id
        and auth.uid() in (d.farmer_id, d.buyer_id)
        and reviews.reviewee_id in (d.farmer_id, d.buyer_id)
        and reviews.reviewee_id <> auth.uid()
    )
  );

-- ---- price_history: public read-only reference data (writes via service role) --
create policy price_history_select_all on price_history
  for select using (true);
