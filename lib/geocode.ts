"use client";

/**
 * Reverse geocoding via OpenStreetMap Nominatim (free, no key). Turns
 * coordinates into a "City, State" label for #6. Fails soft → returns null.
 */
export interface Place {
  city: string | null;
  state: string | null;
  label: string;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<Place | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("zoom", "10");

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const a = json.address ?? {};
    const city =
      a.city || a.town || a.village || a.county || a.suburb || null;
    const state = a.state || null;
    const label =
      [city, state].filter(Boolean).join(", ") ||
      json.display_name?.split(",").slice(0, 2).join(", ") ||
      "Location set";
    return { city, state, label };
  } catch {
    return null;
  }
}
