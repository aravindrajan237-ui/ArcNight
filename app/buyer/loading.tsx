import { Skeleton, ListingCardSkeleton } from "@/components/ui";

export default function BuyerLoading() {
  return (
    <div>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-6 sm:px-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
      <div className="mx-auto mt-5 max-w-5xl px-4 sm:px-6">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
