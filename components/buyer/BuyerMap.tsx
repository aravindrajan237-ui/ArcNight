"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

/** A listing pin for the buyer map. */
export interface MapPinData {
  id: string;
  lat: number;
  lng: number;
  crop: string;
  price: number;
}

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

function priceIcon(price: number) {
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);white-space:nowrap;background:#1F6B3B;color:#fff;font-weight:800;font-size:12px;padding:4px 8px;border-radius:999px;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid #fff">₹${price}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function FitBounds({ pins }: { pins: MapPinData[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [pins, map]);
  return null;
}

export default function BuyerMap({
  pins,
  onSelect,
}: {
  pins: MapPinData[];
  onSelect?: (id: string) => void;
}) {
  return (
    <MapContainer center={INDIA_CENTER} zoom={5} scrollWheelZoom className="h-full w-full">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {pins.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={priceIcon(p.price)}
          eventHandlers={{ click: () => onSelect?.(p.id) }}
        >
          <Popup>
            <span className="font-semibold capitalize">{p.crop}</span> · ₹{p.price}/kg
          </Popup>
        </Marker>
      ))}
      <FitBounds pins={pins} />
    </MapContainer>
  );
}
