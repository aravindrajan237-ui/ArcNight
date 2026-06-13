-- ============================================================================
-- HarvestLink schema
-- Run in the Supabase SQL Editor (or `supabase db push`).
-- Includes: tables, RLS policies, haversine_km(), a profile trigger, and a
-- public Storage bucket for agreement PDFs.
-- ============================================================================

-- ---- Extensions ----
create extension if not exists "pgcrypto";

-- ---- Enums ----
do $$ begin
  create type role as enum ('farmer', 'buyer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_status as enum ('open', 'in_negotiation', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type offer_status as enum ('pending', 'accepted', 'rejected', 'countered');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deal_status as enum ('created', 'advance_paid', 'fulfilled', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- haversine_km(lat1, lng1, lat2, lng2) -> km
-- Mirrors lib/geo.ts so distance filtering matches JS.
-- ============================================================================
create or replace function haversine_km(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) *
    sin(radians(lng2 - lng1) / 2) ^ 2
  ));
$$;

-- ============================================================================
-- Tables
-- ============================================================================

-- profiles: 1:1 with auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role role,
  full_name text,
  phone text,
  lat double precision,
  lng double precision,
  location_label text,
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references profiles(id) on delete cascade,
  crop text not null,
  quantity_kg numeric not null check (quantity_kg > 0),
  price_per_kg numeric not null check (price_per_kg > 0),
  harvest_date date not null,
  negotiable boolean not null default true,
  organic boolean not null default false,
  verified boolean not null default false,
  lat double precision not null,
  lng double precision not null,
  location_label text,
  notes text,
  status listing_status not null default 'open',
  created_at timestamptz not null default now()
);
create index if not exists listings_crop_idx on listings (crop);
create index if not exists listings_status_idx on listings (status);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  offer_price_per_kg numeric not null check (offer_price_per_kg > 0),
  quantity_kg numeric not null check (quantity_kg > 0),
  message text,
  status offer_status not null default 'pending',
  parent_offer_id uuid references offers(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists offers_listing_idx on offers (listing_id);
create index if not exists offers_buyer_idx on offers (buyer_id);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  offer_id uuid not null references offers(id) on delete cascade,
  farmer_id uuid not null references profiles(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  crop text not null,
  quantity_kg numeric not null,
  agreed_price_per_kg numeric not null,
  total_amount numeric not null,
  advance_amount numeric not null,           -- 15% of total
  advance_paid boolean not null default false,
  razorpay_order_id text,
  razorpay_payment_id text,
  agreement_pdf_url text,
  esign_farmer boolean not null default false,
  esign_buyer boolean not null default false,
  status deal_status not null default 'created',
  created_at timestamptz not null default now()
);
create index if not exists deals_farmer_idx on deals (farmer_id);
create index if not exists deals_buyer_idx on deals (buyer_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references deals(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_deal_idx on messages (deal_id);
create index if not exists messages_listing_idx on messages (listing_id);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  reviewer_id uuid not null references profiles(id) on delete cascade,
  reviewee_id uuid not null references profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (deal_id, reviewer_id)
);

-- ============================================================================
-- Auto-create a profile row on signup
-- ============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- Row Level Security
-- NOTE: route handlers that need cross-user writes use the service-role client,
-- which bypasses RLS. These policies guard direct client (anon-key) access.
-- ============================================================================
alter table profiles enable row level security;
alter table listings enable row level security;
alter table offers   enable row level security;
alter table deals    enable row level security;
alter table messages enable row level security;
alter table reviews  enable row level security;

-- profiles: anyone can read (for leaderboard/public farmer info); owner writes.
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select using (true);
drop policy if exists profiles_upsert on profiles;
create policy profiles_upsert on profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update using (auth.uid() = id);

-- listings: public read; only the owning farmer writes.
drop policy if exists listings_read on listings;
create policy listings_read on listings for select using (true);
drop policy if exists listings_insert on listings;
create policy listings_insert on listings for insert with check (auth.uid() = farmer_id);
drop policy if exists listings_update on listings;
create policy listings_update on listings for update using (auth.uid() = farmer_id);

-- offers: visible to the buyer who made it and the farmer who owns the listing.
drop policy if exists offers_read on offers;
create policy offers_read on offers for select using (
  auth.uid() = buyer_id
  or auth.uid() = (select farmer_id from listings where id = offers.listing_id)
);
drop policy if exists offers_insert on offers;
create policy offers_insert on offers for insert with check (auth.uid() = buyer_id);

-- deals: visible to both parties only.
drop policy if exists deals_read on deals;
create policy deals_read on deals for select using (
  auth.uid() = farmer_id or auth.uid() = buyer_id
);

-- messages: visible to participants of the deal/listing.
drop policy if exists messages_read on messages;
create policy messages_read on messages for select using (
  auth.uid() = sender_id
  or auth.uid() = (select farmer_id from deals where id = messages.deal_id)
  or auth.uid() = (select buyer_id  from deals where id = messages.deal_id)
  or auth.uid() = (select farmer_id from listings where id = messages.listing_id)
);
drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert with check (auth.uid() = sender_id);

-- reviews: public read; reviewer writes their own.
drop policy if exists reviews_read on reviews;
create policy reviews_read on reviews for select using (true);
drop policy if exists reviews_insert on reviews;
create policy reviews_insert on reviews for insert with check (auth.uid() = reviewer_id);

-- ============================================================================
-- Storage: public bucket for agreement PDFs
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('agreements', 'agreements', true)
on conflict (id) do nothing;

-- Anyone can read agreement PDFs (URLs are unguessable UUID paths).
drop policy if exists agreements_public_read on storage.objects;
create policy agreements_public_read on storage.objects
  for select using (bucket_id = 'agreements');
-- Note: uploads happen via the service-role client in the verify route handler,
-- which bypasses these policies. No public insert policy is granted on purpose.
