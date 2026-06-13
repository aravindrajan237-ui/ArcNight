import { cn } from "@/lib/cn";

type Tone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-mist text-slate",
  primary: "bg-primary-50 text-primary-700",
  accent: "bg-accent-50 text-accent-700",
  success: "bg-success-50 text-success",
  warning: "bg-warning-50 text-[#9A7416]",
  danger: "bg-danger-50 text-danger",
};

/** Small label pill (counts, organic, verified, etc.). */
export function Badge({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export type AwardKey =
  | "best-seller"
  | "trusted-farmer"
  | "fast-delivery"
  | "frequent-buyer"
  | "organic-hero";

const AWARDS: Record<AwardKey, { emoji: string; label: string; tone: Tone }> = {
  "best-seller": { emoji: "🏆", label: "Best Seller", tone: "warning" },
  "trusted-farmer": { emoji: "🌱", label: "Trusted Farmer", tone: "success" },
  "fast-delivery": { emoji: "⚡", label: "Fast Delivery", tone: "accent" },
  "frequent-buyer": { emoji: "🛒", label: "Frequent Buyer", tone: "primary" },
  "organic-hero": { emoji: "🍃", label: "Organic Hero", tone: "success" },
};

/** Achievement badge with emoji + label. */
export function AwardBadge({
  award,
  size = "md",
  className,
}: {
  award: AwardKey;
  size?: "sm" | "md";
  className?: string;
}) {
  const a = AWARDS[award];
  return (
    <span
      className={cn(
        "inline-flex animate-pop-badge items-center gap-1.5 rounded-pill font-bold",
        toneClasses[a.tone],
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
        className,
      )}
    >
      <span aria-hidden>{a.emoji}</span>
      {a.label}
    </span>
  );
}
