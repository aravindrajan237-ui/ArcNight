"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Tractor,
  ShoppingBasket,
  User,
  Phone,
  LocateFixed,
  MapPin,
  Check,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { onboardingSchema } from "@/lib/validation";
import { reverseGeocode } from "@/lib/geocode";
import { useT, useSetLocale } from "@/lib/i18n/client";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import type { Role, Language } from "@/lib/types";
import { Logo } from "@/components/ui/AppBar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/cn";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

const LANGS: { code: Language; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
];

type Point = { lat: number; lng: number } | null;

export default function OnboardingPage() {
  const router = useRouter();
  const t = useT();
  const setUiLocale = useSetLocale();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [point, setPoint] = useState<Point>(null);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      // Already onboarded → straight to their dashboard.
      const { data: prof } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (prof?.role === "farmer") router.replace("/farmer");
      else if (prof?.role === "buyer") router.replace("/buyer");
    });
  }, [router, supabase]);

  // Auto-request location when the user reaches the location step.
  useEffect(() => {
    if (step === 2 && !point) detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Reverse-geocode (debounced) to auto-fill the city/state label (#6).
  useEffect(() => {
    if (!point) return;
    const t = setTimeout(async () => {
      const place = await reverseGeocode(point.lat, point.lng);
      if (place) setLocationLabel(place.label);
    }, 800);
    return () => clearTimeout(t);
  }, [point]);

  function detectLocation() {
    // Geolocation (like the mic) only works in a secure context (https/localhost).
    const host = typeof location !== "undefined" ? location.hostname : "";
    const secure =
      typeof window !== "undefined" &&
      (window.isSecureContext || host === "localhost" || host === "127.0.0.1");
    if (!secure) {
      setGeoMsg(t("loc.insecure"));
      setManual(true);
      return;
    }
    if (!("geolocation" in navigator)) {
      setGeoMsg(t("loc.failed"));
      setManual(true);
      return;
    }
    setGeoMsg(t("loc.locating"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setRecenterNonce((n) => n + 1);
        setGeoMsg(t("loc.dropped"));
      },
      (err) => {
        setGeoMsg(err.code === err.PERMISSION_DENIED ? t("loc.denied") : t("loc.failed"));
        setManual(true);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const canNext =
    (step === 0 && role) ||
    (step === 1 && fullName.trim().length >= 2) ||
    step === 2;

  async function finish() {
    setError(null);
    const parsed = onboardingSchema.safeParse({
      role,
      full_name: fullName,
      phone: phone || undefined,
      language,
      lat: point?.lat,
      lng: point?.lng,
      location_label: locationLabel ?? undefined,
    });
    if (!parsed.success) {
      setError("Please set your location on the map to finish.");
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        role: parsed.data.role,
        full_name: parsed.data.full_name,
        phone: parsed.data.phone ?? null,
        language: parsed.data.language,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        location_label: parsed.data.location_label ?? null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Apply the chosen language to the whole app.
    document.cookie = `${LOCALE_COOKIE}=${parsed.data.language};path=/;max-age=31536000;samesite=lax`;
    router.replace(parsed.data.role === "farmer" ? "/farmer" : "/buyer");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-6">
      {/* Header + progress */}
      <header className="mb-8 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-pill transition-all duration-300",
                i === step ? "w-7 bg-primary" : i < step ? "w-3 bg-primary-300" : "w-3 bg-mist",
              )}
            />
          ))}
        </div>
      </header>

      <main className="flex-1">
        {step === 0 && (
          <div className="animate-slide-up">
            <h1 className="text-3xl font-extrabold text-ink">
              {t("onb.welcomeTitle")}
            </h1>
            <p className="mt-2 text-slate">{t("onb.welcomeSub")}</p>
            <div className="mt-7 grid grid-cols-2 gap-4">
              <RoleCard
                active={role === "farmer"}
                onClick={() => setRole("farmer")}
                icon={<Tractor className="h-9 w-9" />}
                title={t("onb.farmer")}
                body={t("onb.farmerDesc")}
              />
              <RoleCard
                active={role === "buyer"}
                onClick={() => setRole("buyer")}
                icon={<ShoppingBasket className="h-9 w-9" />}
                title={t("onb.buyer")}
                body={t("onb.buyerDesc")}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-slide-up space-y-5">
            <div>
              <h1 className="text-3xl font-extrabold text-ink">{t("onb.aboutTitle")}</h1>
              <p className="mt-2 text-slate">{t("onb.aboutSub")}</p>
            </div>
            <Input
              label={t("onb.fullName")}
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Lakshmi Devi"
              leftIcon={<User className="h-5 w-5" />}
            />
            <Input
              label={t("onb.phoneOpt")}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              hint="Used for WhatsApp deal receipts."
              leftIcon={<Phone className="h-5 w-5" />}
              inputMode="tel"
            />
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up space-y-5">
            <div>
              <h1 className="text-3xl font-extrabold text-ink">
                {t("onb.locationTitle")}
              </h1>
              <p className="mt-2 text-slate">{t("onb.locationSub")}</p>
            </div>

            <div className="h-64 overflow-hidden rounded-card border border-mist shadow-soft">
              <LocationPicker
                lat={point?.lat}
                lng={point?.lng}
                onChange={(lat, lng) => setPoint({ lat, lng })}
                recenterNonce={recenterNonce}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={detectLocation}
                leftIcon={<LocateFixed className="h-5 w-5" />}
              >
                {t("onb.useMyLocation")}
              </Button>
              {point && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
                  <MapPin className="h-4 w-4 text-primary" />
                  {locationLabel ?? `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`}
                </span>
              )}
            </div>
            {geoMsg && <p className="text-sm text-slate">{geoMsg}</p>}

            {manual && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  defaultValue={point?.lat}
                  onChange={(e) =>
                    setPoint({
                      lat: parseFloat(e.target.value),
                      lng: point?.lng ?? 0,
                    })
                  }
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  defaultValue={point?.lng}
                  onChange={(e) =>
                    setPoint({
                      lat: point?.lat ?? 0,
                      lng: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
            )}
            {!manual && (
              <button
                type="button"
                onClick={() => setManual(true)}
                className="text-sm font-semibold text-primary underline"
              >
                {t("loc.manual")}
              </button>
            )}

            {/* Language */}
            <div>
              <span className="mb-2 block text-sm font-semibold text-ink">
                {t("onb.language")}
              </span>
              <div className="grid grid-cols-3 gap-3">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      setLanguage(l.code);
                      setUiLocale(l.code); // switch the UI language instantly
                    }}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-2xl border p-3 transition-all",
                      language === l.code
                        ? "border-primary bg-primary-50 ring-2 ring-primary"
                        : "border-mist hover:border-primary-200",
                    )}
                  >
                    <span className="text-lg font-bold text-ink">
                      {l.native}
                    </span>
                    <span className="text-xs text-slate">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm font-medium text-danger">{error}</p>
            )}
          </div>
        )}
      </main>

      {/* Footer nav */}
      <footer className="mt-8 flex items-center gap-3">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            {t("common.back")}
          </Button>
        )}
        {step < 2 ? (
          <Button
            size="lg"
            fullWidth
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
            rightIcon={<ArrowRight className="h-5 w-5" />}
          >
            {t("common.continue")}
          </Button>
        ) : (
          <Button
            size="lg"
            fullWidth
            loading={saving}
            disabled={!point}
            onClick={finish}
            leftIcon={<Check className="h-5 w-5" />}
          >
            {t("onb.finish")}
          </Button>
        )}
      </footer>
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-3 rounded-card border p-5 text-left transition-all duration-200",
        active
          ? "border-primary bg-primary-50 shadow-card ring-2 ring-primary"
          : "border-mist bg-white hover:-translate-y-0.5 hover:shadow-card",
      )}
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl",
          active ? "bg-primary text-white" : "bg-primary-50 text-primary",
        )}
      >
        {icon}
      </span>
      <span className="text-lg font-bold text-ink">{title}</span>
      <span className="text-sm leading-snug text-slate">{body}</span>
    </button>
  );
}
