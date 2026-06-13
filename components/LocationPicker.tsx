"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";

/**
 * Interactive Leaflet location picker (client-only — import via next/dynamic
 * with ssr:false). Click the map or drag the pin to set a point. The parent
 * bumps `recenterNonce` (e.g. on "Use my location") to fly the map there;
 * click/drag updates the point WITHOUT recentering, so the map doesn't jump.
 *
 * Uses an inline SVG divIcon so there's no broken-marker-asset issue under
 * bundlers.
 */

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

const pinIcon = L.divIcon({
  className: "hl-pin",
  html: `<div style="transform:translate(-50%,-100%)">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="#E07A2F" stroke="white" stroke-width="1.5">
      <path d="M12 21s-7-6.4-7-11a7 7 0 1 1 14 0c0 4.6-7 11-7 11z"/>
      <circle cx="12" cy="10" r="2.6" fill="white" stroke="none"/>
    </svg></div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

function ClickToPlace({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng, nonce }: { lat?: number; lng?: number; nonce: number }) {
  const map = useMap();
  useEffect(() => {
    if (typeof lat === "number" && typeof lng === "number") {
      map.flyTo([lat, lng], 14, { duration: 0.8 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  return null;
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
  recenterNonce,
}: {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number) => void;
  recenterNonce: number;
}) {
  const hasPoint = typeof lat === "number" && typeof lng === "number";
  const center: [number, number] = hasPoint ? [lat!, lng!] : INDIA_CENTER;

  return (
    <MapContainer
      center={center}
      zoom={hasPoint ? 14 : 5}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ClickToPlace onPick={onChange} />
      {hasPoint && (
        <Marker
          position={[lat!, lng!]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend(e) {
              const p = (e.target as L.Marker).getLatLng();
              onChange(p.lat, p.lng);
            },
          }}
        />
      )}
      <Recenter lat={lat} lng={lng} nonce={recenterNonce} />
    </MapContainer>
  );
}
