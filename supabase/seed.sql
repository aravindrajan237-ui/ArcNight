-- supabase/seed.sql
-- ============================================================================
-- HarvestLink — seed data for the AI pricing engine.
-- ~42 price_history rows: tomato, onion, potato, chilli (green) across 3 regions
-- (Maharashtra, Karnataka, Tamil Nadu) sampled over the last ~60 days.
-- Prices are realistic farm-gate wholesale ₹/kg with a mild summer up-trend;
-- the volatile crops (tomato, chilli) get an extra recent sample.
--
-- Idempotent: clears price_history before inserting so reseeding is safe.
-- ============================================================================

truncate table price_history;

insert into price_history (crop, region, price_per_kg, recorded_on) values
  -- ---- Tomato (volatile; 4 samples per region) ----
  ('tomato', 'Maharashtra', 18, '2026-04-21'),
  ('tomato', 'Maharashtra', 24, '2026-05-16'),
  ('tomato', 'Maharashtra', 32, '2026-06-11'),
  ('tomato', 'Maharashtra', 34, '2026-06-12'),
  ('tomato', 'Karnataka',   16, '2026-04-21'),
  ('tomato', 'Karnataka',   22, '2026-05-16'),
  ('tomato', 'Karnataka',   29, '2026-06-11'),
  ('tomato', 'Karnataka',   30, '2026-06-12'),
  ('tomato', 'Tamil Nadu',  20, '2026-04-21'),
  ('tomato', 'Tamil Nadu',  27, '2026-05-16'),
  ('tomato', 'Tamil Nadu',  35, '2026-06-11'),
  ('tomato', 'Tamil Nadu',  37, '2026-06-12'),

  -- ---- Onion (3 samples per region) ----
  ('onion',  'Maharashtra', 22, '2026-04-21'),
  ('onion',  'Maharashtra', 26, '2026-05-16'),
  ('onion',  'Maharashtra', 31, '2026-06-11'),
  ('onion',  'Karnataka',   20, '2026-04-21'),
  ('onion',  'Karnataka',   24, '2026-05-16'),
  ('onion',  'Karnataka',   28, '2026-06-11'),
  ('onion',  'Tamil Nadu',  24, '2026-04-21'),
  ('onion',  'Tamil Nadu',  28, '2026-05-16'),
  ('onion',  'Tamil Nadu',  33, '2026-06-11'),

  -- ---- Potato (3 samples per region) ----
  ('potato', 'Maharashtra', 14, '2026-04-21'),
  ('potato', 'Maharashtra', 16, '2026-05-16'),
  ('potato', 'Maharashtra', 19, '2026-06-11'),
  ('potato', 'Karnataka',   13, '2026-04-21'),
  ('potato', 'Karnataka',   15, '2026-05-16'),
  ('potato', 'Karnataka',   18, '2026-06-11'),
  ('potato', 'Tamil Nadu',  15, '2026-04-21'),
  ('potato', 'Tamil Nadu',  17, '2026-05-16'),
  ('potato', 'Tamil Nadu',  21, '2026-06-11'),

  -- ---- Chilli / green (volatile; 4 samples per region) ----
  ('chilli', 'Maharashtra', 38, '2026-04-21'),
  ('chilli', 'Maharashtra', 45, '2026-05-16'),
  ('chilli', 'Maharashtra', 55, '2026-06-11'),
  ('chilli', 'Maharashtra', 58, '2026-06-12'),
  ('chilli', 'Karnataka',   35, '2026-04-21'),
  ('chilli', 'Karnataka',   42, '2026-05-16'),
  ('chilli', 'Karnataka',   52, '2026-06-11'),
  ('chilli', 'Karnataka',   54, '2026-06-12'),
  ('chilli', 'Tamil Nadu',  40, '2026-04-21'),
  ('chilli', 'Tamil Nadu',  48, '2026-05-16'),
  ('chilli', 'Tamil Nadu',  60, '2026-06-11'),
  ('chilli', 'Tamil Nadu',  63, '2026-06-12');
-- 42 rows total.
