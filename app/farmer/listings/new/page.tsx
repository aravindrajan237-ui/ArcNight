"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Camera,
  Sparkles,
  Loader2,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  AppBar,
  Button,
  Input,
  Stepper,
  SegmentedToggle,
  Card,
  PriceChip,
  useToast,
} from "@/components/ui";
import {
  isVoiceSupported,
  listenOnce,
  parseListingSpeech,
  VOICE_LANGS,
  type VoiceLang,
} from "@/lib/voice";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/client";

const CROPS = [
  { key: "tomato", label: "Tomato", emoji: "🍅" },
  { key: "onion", label: "Onion", emoji: "🧅" },
  { key: "potato", label: "Potato", emoji: "🥔" },
  { key: "chilli", label: "Chilli", emoji: "🌶️" },
  { key: "banana", label: "Banana", emoji: "🍌" },
  { key: "other", label: "Other", emoji: "🌾" },
];
const REGIONS = ["Maharashtra", "Karnataka", "Tamil Nadu", "Other"];

function dateInDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

interface Estimate {
  estimate: number;
  low: number;
  high: number;
  basis: string;
}

export default function NewListingPage() {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [lang, setLang] = useState<VoiceLang>("en-IN");
  const [listening, setListening] = useState(false);

  const [crop, setCrop] = useState("");
  const [cropKey, setCropKey] = useState<string>("");
  const [variety, setVariety] = useState("");
  const [qty, setQty] = useState(50);
  const [harvestDate, setHarvestDate] = useState(dateInDays(7));
  const [organic, setOrganic] = useState<"yes" | "no">("no");
  const [negotiable, setNegotiable] = useState<"yes" | "no">("yes");
  const [region, setRegion] = useState("Maharashtra");
  const [customRegion, setCustomRegion] = useState("");

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [offerPrice, setOfferPrice] = useState(30);

  const [publishing, setPublishing] = useState(false);

  const regionValue = region === "Other" ? customRegion : region;

  function selectCrop(key: string, label: string) {
    setCropKey(key);
    setCrop(key === "other" ? "" : label.toLowerCase());
  }

  // ---- Voice ----
  async function handleVoice() {
    // Web Speech needs a secure context (https / localhost) — on a network IP
    // or embedded preview it silently fails without ever prompting for the mic.
    const host = typeof location !== "undefined" ? location.hostname : "";
    const secure =
      typeof window !== "undefined" &&
      (window.isSecureContext || host === "localhost" || host === "127.0.0.1");
    if (!secure) {
      toast.error(t("voice.failed"), t("voice.insecure"));
      return;
    }
    if (!isVoiceSupported()) {
      toast.error(t("voice.failed"), "Use Chrome or Edge for voice input.");
      return;
    }
    setListening(true);
    try {
      const transcript = await listenOnce(lang);
      if (!transcript) {
        toast.info("Didn't catch that", "Try speaking again.");
        return;
      }
      toast.info("Heard you", `"${transcript}"`);
      const parsed = await parseListingSpeech(transcript, lang);
      if (parsed.crop) {
        const match = CROPS.find((c) => c.key === parsed.crop);
        selectCrop(match?.key ?? "other", parsed.crop);
        if (!match) setCrop(parsed.crop);
      }
      if (parsed.quantity_kg) setQty(Math.round(parsed.quantity_kg));
      if (parsed.harvest_in_days) setHarvestDate(dateInDays(parsed.harvest_in_days));
      toast.success("Form pre-filled", "Review and adjust below.");
    } catch (e) {
      toast.error("Voice failed", e instanceof Error ? e.message : undefined);
    } finally {
      setListening(false);
    }
  }

  // ---- Photo upload ----
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVerifying(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/verify-crop", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        toast.error(t("nl.photoFailed"), json.error ?? undefined);
        return;
      }
      setPhotoUrl(json.data.crop_photo_url ?? null);
      toast.success(t("nl.photoAdded"));
    } catch {
      toast.error(t("nl.photoFailed"), "Check your connection and retry.");
    } finally {
      setVerifying(false);
    }
  }

  // ---- AI price ----
  async function checkPrice() {
    if (!crop || !regionValue) {
      toast.info("Pick a crop and region first");
      return;
    }
    setPriceLoading(true);
    try {
      const res = await fetch(
        `/api/price-estimate?crop=${encodeURIComponent(crop)}&region=${encodeURIComponent(regionValue)}`,
      );
      const json = await res.json();
      if (!res.ok || !json.data?.estimate) {
        toast.error("No price data", "Set your price manually.");
        return;
      }
      const est = json.data as Estimate;
      setEstimate(est);
      setOfferPrice(Math.round(est.estimate));
    } catch {
      toast.error("Price check failed");
    } finally {
      setPriceLoading(false);
    }
  }

  // ---- Publish ----
  async function publish() {
    if (!crop) return toast.error("Add a crop");
    if (offerPrice <= 0) return toast.error("Set your price");
    setPublishing(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop,
          variety: variety || undefined,
          quantity_kg: qty,
          offer_price: offerPrice,
          market_price: estimate?.estimate,
          expected_harvest_date: harvestDate,
          is_organic: organic === "yes",
          is_negotiable: negotiable === "yes",
          crop_photo_url: photoUrl ?? undefined,
          location_label: regionValue || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error("Couldn't publish", json.error ?? undefined);
        return;
      }
      toast.success("Harvest published 🎉", "Buyers nearby can see it now.");
      router.push(`/farmer/listings/${json.data.id}`);
    } catch {
      toast.error("Network error", "Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  const sliderMin = estimate ? Math.max(1, Math.round(estimate.low * 0.6)) : 5;
  const sliderMax = estimate ? Math.round(estimate.high * 1.5) : 120;

  return (
    <div>
      <AppBar title={t("nl.title")} back="/farmer" />
      <main className="mx-auto max-w-xl space-y-7 px-4 pb-44 pt-6 sm:px-6 md:pb-32">
        {/* Voice hero */}
        <Card inset className="bg-primary text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-extrabold">{t("nl.speak")}</p>
              <p className="text-sm text-white/80">
                {t("nl.speakHint")}
              </p>
            </div>
            <div className="flex shrink-0 gap-1 rounded-pill bg-white/15 p-1">
              {VOICE_LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    "rounded-pill px-2.5 py-1 text-xs font-bold transition",
                    lang === l.code ? "bg-white text-primary" : "text-white/80",
                  )}
                >
                  {l.code.split("-")[0].toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleVoice}
            disabled={listening}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-5 text-lg font-extrabold text-primary transition active:scale-[0.98] disabled:opacity-80"
          >
            {listening ? (
              <>
                <span className="relative flex h-6 w-6">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/50" />
                  <Mic className="relative h-6 w-6 text-accent" />
                </span>
                {t("nl.listening")}
              </>
            ) : (
              <>
                <Mic className="h-6 w-6" /> {t("nl.tapSpeak")}
              </>
            )}
          </button>
        </Card>

        {/* Crop picker */}
        <Field label={t("nl.whatCrop")}>
          <div className="grid grid-cols-3 gap-2.5">
            {CROPS.map((c) => (
              <button
                key={c.key}
                onClick={() => selectCrop(c.key, c.label)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border py-3 transition-all",
                  cropKey === c.key
                    ? "border-primary bg-primary-50 ring-2 ring-primary"
                    : "border-mist hover:border-primary-200",
                )}
              >
                <span className="text-2xl">{c.emoji}</span>
                <span className="text-sm font-semibold text-ink">{c.label}</span>
              </button>
            ))}
          </div>
          {cropKey === "other" && (
            <Input
              className="mt-3"
              placeholder="Type your crop"
              value={crop}
              onChange={(e) => setCrop(e.target.value.toLowerCase())}
            />
          )}
        </Field>

        <Input
          label={t("nl.variety")}
          placeholder="e.g. Roma, Nashik Red"
          value={variety}
          onChange={(e) => setVariety(e.target.value)}
        />

        <Field label={t("nl.quantity")}>
          <Stepper value={qty} onChange={setQty} step={10} min={1} />
        </Field>

        <Input
          label={t("nl.harvestDate")}
          type="date"
          value={harvestDate}
          onChange={(e) => setHarvestDate(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Field label={t("nl.organic")}>
            <SegmentedToggle
              value={organic}
              onChange={setOrganic}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </Field>
          <Field label={t("nl.negotiable")}>
            <SegmentedToggle
              value={negotiable}
              onChange={setNegotiable}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
            />
          </Field>
        </div>

        {/* Photo + AI verify */}
        <Field label={t("nl.photo")}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhoto}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={verifying}
            className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-mist bg-white p-4 text-left transition hover:border-primary-200"
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="crop" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-50 text-primary">
                {verifying ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              </span>
            )}
            <span className="flex-1">
              <span className="block font-semibold text-ink">
                {verifying ? t("nl.uploading") : photoUrl ? t("nl.changePhoto") : t("nl.addPhoto")}
              </span>
              <span className="text-sm text-slate">{t("nl.photoHint")}</span>
            </span>
          </button>
        </Field>

        {/* Pricing */}
        <Field label={t("nl.fairPrice")}>
          <Card inset className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="h-11 rounded-xl border border-mist bg-white px-3 text-sm font-semibold"
              >
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              {region === "Other" && (
                <input
                  value={customRegion}
                  onChange={(e) => setCustomRegion(e.target.value)}
                  placeholder="Region"
                  className="h-11 flex-1 rounded-xl border border-mist px-3 text-sm"
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={checkPrice}
                loading={priceLoading}
                leftIcon={<TrendingUp className="h-4 w-4" />}
              >
                {t("nl.checkPrice")}
              </Button>
            </div>

            {estimate && (
              <div className="rounded-2xl bg-primary-50 p-3.5">
                <div className="flex items-center gap-2 text-primary-700">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-bold">{t("nl.aiEstimate")}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <PriceChip amount={estimate.estimate} tone="market" label="Market" />
                  <span className="text-sm font-semibold text-primary-700">
                    {t("nl.fairRange")} ₹{estimate.low}–₹{estimate.high}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate">{estimate.basis}</p>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{t("nl.yourPrice")}</span>
                <PriceChip amount={offerPrice} />
              </div>
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                value={offerPrice}
                onChange={(e) => setOfferPrice(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-pill bg-mist accent-accent"
              />
              {estimate && Math.abs(offerPrice - estimate.estimate) / estimate.estimate > 0.2 && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {t("nl.offPrice")}
                </p>
              )}
            </div>
          </Card>
        </Field>
      </main>

      {/* Sticky publish — sits above the mobile bottom nav (64px) */}
      <div className="fixed inset-x-0 bottom-[64px] z-20 border-t border-mist bg-white/95 p-4 backdrop-blur md:bottom-0 md:pl-64">
        <div className="mx-auto max-w-xl">
          <Button
            size="xl"
            fullWidth
            loading={publishing}
            disabled={!crop}
            onClick={publish}
          >
            {t("nl.publish")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </div>
  );
}
