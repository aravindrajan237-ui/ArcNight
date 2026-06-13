-- supabase/migrations/0002_features.sql
-- ============================================================================
-- Feature additions: scam reports + voice-message columns.
-- Run AFTER 0001_init.sql (Supabase SQL editor or `supabase db push`).
-- ============================================================================

-- ---- Scam / abuse reports (#3) ----
create table if not exists reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null references profiles(id) on delete cascade,
  reported_user_id uuid references profiles(id) on delete set null,
  listing_id       uuid references harvest_listings(id) on delete set null,
  deal_id          uuid references deals(id) on delete set null,
  reason           text not null check (reason in
                     ('fraud_scam','fake_listing','payment_issue','abusive','spam','other')),
  description      text,
  status           text not null default 'open'
                     check (status in ('open','reviewing','resolved','dismissed')),
  created_at       timestamptz not null default now()
);
create index if not exists reports_reported_idx on reports (reported_user_id);
create index if not exists reports_status_idx on reports (status);

alter table reports enable row level security;
-- A user may file reports and see their own. Admins read everything via the
-- service-role client (bypasses RLS).
drop policy if exists reports_insert_self on reports;
create policy reports_insert_self on reports
  for insert with check (auth.uid() = reporter_id);
drop policy if exists reports_select_self on reports;
create policy reports_select_self on reports
  for select using (auth.uid() = reporter_id);

-- ---- Location label on profiles (#6) — auto-filled city/state ----
alter table profiles add column if not exists location_label text;

-- ---- Voice messages (#1) ----
-- A chat message can carry an audio clip stored in the 'voice-messages' bucket.
alter table messages add column if not exists audio_url text;
alter table messages add column if not exists audio_duration_sec numeric;

-- Public read bucket for voice clips (uploads happen via the user/anon client).
insert into storage.buckets (id, name, public)
values ('voice-messages', 'voice-messages', true)
on conflict (id) do nothing;

drop policy if exists voice_public_read on storage.objects;
create policy voice_public_read on storage.objects
  for select using (bucket_id = 'voice-messages');
drop policy if exists voice_auth_insert on storage.objects;
create policy voice_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'voice-messages');

-- ---- Enable Supabase Realtime on chat messages (idempotent) ----
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; end $$;
