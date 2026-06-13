import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

const sizeMap = {
  sm: { box: "h-9 w-9 text-sm", ring: "ring-2" },
  md: { box: "h-12 w-12 text-base", ring: "ring-2" },
  lg: { box: "h-16 w-16 text-xl", ring: "ring-[3px]" },
  xl: { box: "h-24 w-24 text-3xl", ring: "ring-4" },
};

/** Avatar (photo or initials). Optional trust score badge clipped to corner. */
export function Avatar({
  name,
  src,
  size = "md",
  trustScore,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: keyof typeof sizeMap;
  trustScore?: number;
  className?: string;
}) {
  const s = sizeMap[size];
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? "avatar"}
          className={cn(
            "rounded-2xl object-cover ring-white",
            s.box,
            s.ring,
          )}
        />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-2xl bg-primary-100 font-bold text-primary-700 ring-white",
            s.box,
            s.ring,
          )}
        >
          {initials(name)}
        </span>
      )}
      {typeof trustScore === "number" && (
        <span className="absolute -bottom-1.5 -right-1.5 inline-flex items-center gap-0.5 rounded-pill bg-white px-1.5 py-0.5 text-[11px] font-bold text-ink shadow-soft ring-1 ring-mist">
          <Star className="h-3 w-3 text-warning" fill="currentColor" />
          {trustScore.toFixed(1)}
        </span>
      )}
    </span>
  );
}

/** Avatar + name + trust/deals line — used in app bars and farmer chips. */
export function UserChip({
  name,
  src,
  trustScore,
  dealsCount,
  subtitle,
  size = "md",
}: {
  name: string;
  src?: string | null;
  trustScore?: number;
  dealsCount?: number;
  subtitle?: string;
  size?: keyof typeof sizeMap;
}) {
  const meta =
    subtitle ??
    [
      typeof trustScore === "number" ? `⭐ ${trustScore.toFixed(1)}` : null,
      typeof dealsCount === "number" ? `${dealsCount} deals` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  return (
    <span className="inline-flex items-center gap-3">
      <Avatar name={name} src={src} size={size} />
      <span className="leading-tight">
        <span className="block font-bold text-ink">{name}</span>
        {meta && <span className="block text-sm text-slate">{meta}</span>}
      </span>
    </span>
  );
}
