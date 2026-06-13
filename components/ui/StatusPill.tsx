import {
  Sprout,
  Lock,
  BadgeIndianRupee,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

export type ListingStatus =
  | "open"
  | "reserved"
  | "paid"
  | "fulfilled"
  | "cancelled";

const MAP: Record<
  ListingStatus,
  { label: string; cls: string; Icon: LucideIcon }
> = {
  open: {
    label: "Open",
    cls: "bg-primary-50 text-primary-700",
    Icon: Sprout,
  },
  reserved: {
    label: "Reserved",
    cls: "bg-warning-50 text-[#9A7416]",
    Icon: Lock,
  },
  paid: {
    label: "Advance paid",
    cls: "bg-accent-50 text-accent-700",
    Icon: BadgeIndianRupee,
  },
  fulfilled: {
    label: "Fulfilled",
    cls: "bg-success-50 text-success",
    Icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    cls: "bg-danger-50 text-danger",
    Icon: XCircle,
  },
};

/** Coloured status pill for a harvest contract / deal. */
export function StatusPill({
  status,
  size = "md",
  className,
}: {
  status: ListingStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const { label, cls, Icon } = MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        cls,
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {label}
    </span>
  );
}
