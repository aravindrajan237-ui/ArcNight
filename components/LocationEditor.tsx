"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { LocateFixed, MapPin, Save } from "lucide-react";
import { Card, Button, Skeleton, useToast } from "@/components/ui";
import { reverseGeocode } from "@/lib/geocode";
import { useT } from "@/lib/i18n/client";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

type Point = { lat: number; lng: number } | null;

/**
 * Profile location editor — interactive map + "Use my location" auto-detect +
 * reverse-geocoded city/state + save. Mirrors the onboarding location step so
 * the feature is reachable even after onboarding.
 */
export function LocationEditor({
  initialLat,
  initialLng,
  initialLabel,
}: {
  initialLat: number | null;
  initialLng: number | null;
  initialLabel: string | null;
}) {
  const t = useT();
  const toast = useToast();
  const [point, setPoint] = useState<Point>(
    initialLat != null && initialLng != null
      ? { lat: initialLat, lng: initialLng }
      : null,
  );
  const [label, setLabel] = useState<string | null>(initialLabel);
  const [nonce, setNonce] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reverse-geocode (debounced) → city/state label.
  useEffect(() => {
    if (!point) return;
    const id = setTimeout(async () => {
      const place = await reverseGeocode(point.lat, point.lng);
      if (place) setLabel(place.label);
    }, 800);
    return () => clearTimeout(id);
  }, [point]);

  function detect() {
    const host = typeof location !== "undefined" ? location.hostname : "";
    const secure =
      typeof window !== "undefined" &&
      (window.isSecureContext || host === "localhost" || host === "127.0.0.1");
    if (!secure) {
      setMsg(t("loc.insecure"));
      return;
    }
    if (!("geolocation" in navigator)) {
      setMsg(t("loc.failed"));
      return;
    }
    setMsg(t("loc.locating"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNonce((n) => n + 1);
        setMsg(t("loc.dropped"));
      },
      (err) => setMsg(err.code === err.PERMISSION_DENIED ? t("loc.denied") : t("loc.failed")),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function save() {
    if (!point) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: point.lat,
          lng: point.lng,
          location_label: label ?? undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      toast.success(t("loc.saved"), label ?? undefined);
    } catch (e) {
      toast.error(t("loc.failed"), e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card inset className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-ink">{t("loc.update")}</span>
        {label && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-slate">
            <MapPin className="h-4 w-4 text-primary" />
            {label}
          </span>
        )}
      </div>

      <div className="h-56 overflow-hidden rounded-card border border-mist">
        <LocationPicker
          lat={point?.lat}
          lng={point?.lng}
          onChange={(lat, lng) => setPoint({ lat, lng })}
          recenterNonce={nonce}
        />
      </div>

      {msg && <p className="text-sm text-slate">{msg}</p>}

      <div className="flex gap-2.5">
        <Button variant="outline" onClick={detect} leftIcon={<LocateFixed className="h-5 w-5" />}>
          {t("onb.useMyLocation")}
        </Button>
        <Button fullWidth onClick={save} loading={saving} disabled={!point} leftIcon={<Save className="h-5 w-5" />}>
          {t("loc.save")}
        </Button>
      </div>
    </Card>
  );
}
