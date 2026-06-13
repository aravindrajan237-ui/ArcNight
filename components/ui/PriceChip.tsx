import { cn } from "@/lib/cn";

/**
 * Price display chip. Accent/terracotta = the live price (CTA-weight). Use
 * `tone="market"` for the muted reference market price.
 */
export function PriceChip({
  amount,
  unit = "/kg",
  tone = "accent",
  size = "md",
  label,
  className,
}: {
  amount: number;
  unit?: string;
  tone?: "accent" | "market" | "muted";
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const toneCls = {
    accent: "bg-accent-50 text-accent-700",
    market: "bg-mist text-slate",
    muted: "bg-white text-ink border border-mist",
  }[tone];
  const sizeCls = {
    sm: "px-2.5 py-1 text-sm",
    md: "px-3 py-1.5 text-base",
    lg: "px-4 py-2 text-xl",
  }[size];
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 rounded-xl font-bold tabular-nums",
        toneCls,
        sizeCls,
        className,
      )}
    >
      {label && (
        <span className="mr-1 text-[0.7em] font-semibold uppercase tracking-wide opacity-70">
          {label}
        </span>
      )}
      <span className="font-extrabold">₹{amount.toLocaleString("en-IN")}</span>
      <span className="text-[0.7em] font-semibold opacity-75">{unit}</span>
    </span>
  );
}
