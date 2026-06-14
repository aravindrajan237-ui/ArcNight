"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search, SlidersHorizontal, Map as MapIcon, List, X, Leaf, ShieldCheck } from "lucide-react";
import {
  Button,
  Badge,
  SegmentedToggle,
  EmptyState,
  ListingCardSkeleton,
  Skeleton,
} from "@/components/ui";
import { ListingCard } from "./ListingCard";
import type { MapPinData } from "./BuyerMap";
import type { ListingWithFarmer } from "@/app/api/listings/route";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n/client";

const BuyerMap = dynamic(() => import("./BuyerMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

const CROPS = ["Tomato", "Onion", "Potato", "Chilli", "Banana"];

interface Filters {
  crop: string;
  maxDistance: number; // 0 = any
  minPrice: string;
  maxPrice: string;
  harvestBefore: string;
  organic: boolean;
  negotiable: boolean;
  verified: boolean;
}

const EMPTY: Filters = {
  crop: "",
  maxDistance: 0,
  minPrice: "",
  maxPrice: "",
  harvestBefore: "",
  organic: false,
  negotiable: false,
  verified: false,
};

export function BuyerExplore({
  meLat,
  meLng,
}: {
  meLat: number | null;
  meLng: number | null;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [listings, setListings] = useState<ListingWithFarmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "map">("list");
  const [sheet, setSheet] = useState(false);
  const t = useT();

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filters.crop) p.set("crop", filters.crop);
    if (filters.minPrice) p.set("min_price", filters.minPrice);
    if (filters.maxPrice) p.set("max_price", filters.maxPrice);
    if (filters.harvestBefore) p.set("harvest_before", filters.harvestBefore);
    if (filters.organic) p.set("organic", "true");
    if (filters.negotiable) p.set("negotiable", "true");
    if (filters.verified) p.set("verified", "true");
    if (filters.maxDistance > 0 && meLat != null && meLng != null) {
      p.set("max_distance_km", String(filters.maxDistance));
      p.set("near_lat", String(meLat));
      p.set("near_lng", String(meLng));
    }
    try {
      const res = await fetch(`/api/listings?${p.toString()}`);
      const json = await res.json();
      setListings(res.ok ? (json.data ?? []) : []);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [filters, meLat, meLng]);

  // Debounce so typing in search / dragging sliders doesn't refetch per change.
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  const pins: MapPinData[] = useMemo(
    () =>
      listings
        .filter((l) => l.lat != null && l.lng != null)
        .map((l) => ({
          id: l.id,
          lat: l.lat!,
          lng: l.lng!,
          crop: l.crop,
          price: Number(l.offer_price ?? 0),
        })),
    [listings],
  );

  const activeCount =
    (filters.crop ? 1 : 0) +
    (filters.maxDistance ? 1 : 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    (filters.harvestBefore ? 1 : 0) +
    (filters.organic ? 1 : 0) +
    (filters.negotiable ? 1 : 0) +
    (filters.verified ? 1 : 0);

  return (
    <div>
      {/* Search + controls */}
      <div className="sticky top-0 z-20 space-y-3 border-b border-mist bg-surface/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate" />
            <input
              value={filters.crop}
              onChange={(e) => setFilters((f) => ({ ...f, crop: e.target.value }))}
              placeholder={t("buyer.search")}
              className="h-12 w-full rounded-2xl border border-mist bg-white pl-11 pr-4 text-[15px] focus:border-primary-300 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSheet(true)}
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-mist bg-white text-ink"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-5 w-5" />
            {activeCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent px-1 text-xs font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Quick crop chips + view toggle */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          <div className="flex gap-2">
            {CROPS.map((c) => (
              <button
                key={c}
                onClick={() =>
                  setFilters((f) => ({ ...f, crop: f.crop === c ? "" : c }))
                }
                className={cn(
                  "shrink-0 rounded-pill border px-3.5 py-1.5 text-sm font-semibold capitalize transition",
                  filters.crop === c
                    ? "border-primary bg-primary text-white"
                    : "border-mist bg-white text-slate hover:border-primary-200",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="ml-auto shrink-0">
            <SegmentedToggle
              value={view}
              onChange={setView}
              options={[
                { value: "list", label: "List", icon: <List className="h-4 w-4" /> },
                { value: "map", label: "Map", icon: <MapIcon className="h-4 w-4" /> },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        {view === "map" ? (
          <div className="h-[60vh] overflow-hidden rounded-card border border-mist shadow-soft">
            <BuyerMap pins={pins} />
          </div>
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ListingCardSkeleton key={i} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <EmptyState
            icon={<Search className="h-7 w-7" />}
            title="No harvests match"
            description="Try widening your filters or searching a different crop."
            action={<Button variant="outline" onClick={() => setFilters(EMPTY)}>Clear filters</Button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <ListingCard key={l.id} l={l} />
            ))}
          </div>
        )}
      </div>

      {/* Filter sheet */}
      {sheet && (
        <FilterSheet
          initial={filters}
          onClose={() => setSheet(false)}
          onApply={(f) => {
            setFilters(f);
            setSheet(false);
          }}
          canDistance={meLat != null && meLng != null}
        />
      )}
    </div>
  );
}

function FilterSheet({
  initial,
  onClose,
  onApply,
  canDistance,
}: {
  initial: Filters;
  onClose: () => void;
  onApply: (f: Filters) => void;
  canDistance: boolean;
}) {
  const [d, setD] = useState<Filters>(initial);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-lifted animate-slide-up sm:max-w-md sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-ink">Filters</h2>
          <button onClick={onClose} className="rounded-xl p-2 text-slate hover:bg-mist">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          {canDistance && (
            <Group label={`Within ${d.maxDistance || "any"} ${d.maxDistance ? "km" : ""}`}>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={d.maxDistance}
                onChange={(e) => setD({ ...d, maxDistance: Number(e.target.value) })}
                className="h-2 w-full appearance-none rounded-pill bg-mist accent-primary"
              />
            </Group>
          )}

          <Group label="Price (₹/kg)">
            <div className="flex items-center gap-3">
              <input
                inputMode="numeric"
                placeholder="Min"
                value={d.minPrice}
                onChange={(e) => setD({ ...d, minPrice: e.target.value })}
                className="h-12 w-full rounded-xl border border-mist px-3"
              />
              <span className="text-slate">–</span>
              <input
                inputMode="numeric"
                placeholder="Max"
                value={d.maxPrice}
                onChange={(e) => setD({ ...d, maxPrice: e.target.value })}
                className="h-12 w-full rounded-xl border border-mist px-3"
              />
            </div>
          </Group>

          <Group label="Harvest before">
            <input
              type="date"
              value={d.harvestBefore}
              onChange={(e) => setD({ ...d, harvestBefore: e.target.value })}
              className="h-12 w-full rounded-xl border border-mist px-3"
            />
          </Group>

          <div className="space-y-2.5">
            <Toggle
              label="Organic only"
              icon={<Leaf className="h-4 w-4 text-success" />}
              on={d.organic}
              onChange={(v) => setD({ ...d, organic: v })}
            />
            <Toggle
              label="Negotiable only"
              on={d.negotiable}
              onChange={(v) => setD({ ...d, negotiable: v })}
            />
            <Toggle
              label="With photo only"
              icon={<ShieldCheck className="h-4 w-4 text-primary" />}
              on={d.verified}
              onChange={(v) => setD({ ...d, verified: v })}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="ghost" onClick={() => setD(EMPTY)}>
            Reset
          </Button>
          <Button fullWidth onClick={() => onApply(d)}>
            Show results
          </Button>
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  label,
  icon,
  on,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between rounded-2xl border border-mist px-4 py-3"
    >
      <span className="flex items-center gap-2 font-semibold text-ink">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-pill transition-colors",
          on ? "bg-primary" : "bg-mist",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-all",
            on ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
