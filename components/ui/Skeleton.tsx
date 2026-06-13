import { cn } from "@/lib/cn";

/** Shimmering placeholder block. Compose for richer loading states. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "skeleton-shimmer relative overflow-hidden rounded-xl bg-mist",
        className,
      )}
    />
  );
}

/** Ready-made skeleton for a harvest contract card. */
export function ListingCardSkeleton() {
  return (
    <div className="rounded-card border border-mist bg-white p-4 shadow-soft">
      <Skeleton className="h-36 w-full rounded-2xl" />
      <div className="mt-4 space-y-2.5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-7 w-20 rounded-pill" />
          <Skeleton className="h-7 w-16 rounded-pill" />
        </div>
      </div>
    </div>
  );
}

/** A short list of line skeletons. */
export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i === lines - 1 ? "w-1/2" : "w-full")}
        />
      ))}
    </div>
  );
}
