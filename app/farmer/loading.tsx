import { Skeleton, ListingCardSkeleton } from "@/components/ui";

export default function FarmerLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
      <Skeleton className="mt-6 h-24 w-full rounded-card" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-24 rounded-card" />
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <ListingCardSkeleton />
        <ListingCardSkeleton />
      </div>
    </div>
  );
}
