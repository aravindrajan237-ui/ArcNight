"use client";

import { useState } from "react";
import { MapPin, LocateFixed } from "lucide-react";

export interface LatLng {
  lat: number;
  lng: number;
  label?: string;
}

/**
 * Captures the user's location via the browser Geolocation API, with a manual
 * lat/lng entry fallback (geolocation can be denied or unavailable). Calls
 * `onChange` whenever a valid position is set.
 */
export function LocationCapture({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [manual, setManual] = useState(false);

  function detect() {
    if (!("geolocation" in navigator)) {
      setStatus("Geolocation not supported — enter coordinates manually.");
      setManual(true);
      return;
    }
    setStatus("Locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("Location captured ✓");
      },
      () => {
        setStatus("Couldn't get location — enter it manually below.");
        setManual(true);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={detect}
        className="inline-flex items-center gap-2 rounded-lg border border-harvest-500 px-4 py-2 text-sm font-semibold text-harvest-600 hover:bg-harvest-50"
      >
        <LocateFixed className="h-4 w-4" /> Use my current location
      </button>

      {status && <p className="text-sm text-zinc-600">{status}</p>}

      {value && (
        <p className="flex items-center gap-1 text-sm text-zinc-700">
          <MapPin className="h-4 w-4 text-harvest-500" />
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}

      <button
        type="button"
        onClick={() => setManual((m) => !m)}
        className="text-sm text-harvest-600 underline"
      >
        {manual ? "Hide" : "Enter coordinates manually"}
      </button>

      {manual && (
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            defaultValue={value?.lat}
            onChange={(e) =>
              onChange({
                lat: parseFloat(e.target.value),
                lng: value?.lng ?? 0,
              })
            }
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            defaultValue={value?.lng}
            onChange={(e) =>
              onChange({
                lat: value?.lat ?? 0,
                lng: parseFloat(e.target.value),
              })
            }
            className="rounded-lg border border-zinc-300 px-3 py-2"
          />
        </div>
      )}
    </div>
  );
}
