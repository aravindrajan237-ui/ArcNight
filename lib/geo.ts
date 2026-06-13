/**
 * Great-circle distance between two lat/lng points in kilometres.
 * Mirrors the SQL `haversine_km()` function in supabase/schema.sql so distance
 * filtering gives identical results whether computed in Postgres or in JS.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius (km)
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.asin(Math.sqrt(a));
}
