import { MapPin, Navigation } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Presentational map card. Renders a stylised map texture with a centered pin
 * and an optional location label / distance. When a live react-leaflet map is
 * available, pass it as `children` to render in place of the texture.
 */
export function MapCard({
  label,
  distanceKm,
  height = 180,
  children,
  className,
}: {
  label?: string;
  distanceKm?: number;
  height?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card border border-mist shadow-soft",
        className,
      )}
      style={{ height }}
    >
      {children ?? (
        <div className="bg-map-grid h-full w-full">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="relative flex">
              <span className="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-accent/30" />
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-lifted">
                <MapPin className="h-5 w-5" fill="currentColor" />
              </span>
            </span>
          </div>
        </div>
      )}

      {(label || typeof distanceKm === "number") && (
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          {label && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/95 px-3 py-1.5 text-sm font-semibold text-ink shadow-soft backdrop-blur">
              <MapPin className="h-4 w-4 text-primary" />
              {label}
            </span>
          )}
          {typeof distanceKm === "number" && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-3 py-1.5 text-sm font-bold text-white shadow-soft">
              <Navigation className="h-3.5 w-3.5" />
              {distanceKm.toFixed(1)} km
            </span>
          )}
        </div>
      )}
    </div>
  );
}
