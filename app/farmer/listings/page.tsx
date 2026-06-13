import Link from "next/link";
import { Plus, Sprout } from "lucide-react";
import { getMe } from "@/lib/session";
import {
  AppBar,
  Card,
  StatusPill,
  PriceChip,
  Badge,
  EmptyState,
  PrimaryButton,
  type ListingStatus,
} from "@/components/ui";
import type { HarvestListing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FarmerListings() {
  const { supabase, user } = await getMe();
  const { data } = await supabase
    .from("harvest_listings")
    .select("*")
    .eq("farmer_id", user.id)
    .order("created_at", { ascending: false });
  const listings = (data ?? []) as HarvestListing[];

  return (
    <div>
      <AppBar
        title="My listings"
        actions={
          <Link href="/farmer/listings/new">
            <PrimaryButton size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              Add
            </PrimaryButton>
          </Link>
        }
      />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6">
        {listings.length === 0 ? (
          <EmptyState
            icon={<Sprout className="h-7 w-7" />}
            title="No listings yet"
            description="Publish your first harvest contract to start receiving offers."
            action={
              <Link href="/farmer/listings/new">
                <PrimaryButton leftIcon={<Plus className="h-5 w-5" />}>Add Harvest</PrimaryButton>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {listings.map((l) => (
              <Link key={l.id} href={`/farmer/listings/${l.id}`}>
                <Card interactive className="overflow-hidden">
                  {l.crop_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.crop_photo_url} alt={l.crop} className="h-28 w-full object-cover" />
                  ) : (
                    <div className="bg-map-grid flex h-28 items-center justify-center">
                      <Sprout className="h-8 w-8 text-primary/50" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold capitalize text-ink">{l.crop}</h3>
                      <StatusPill status={l.status as ListingStatus} size="sm" />
                    </div>
                    <p className="mt-0.5 text-sm text-slate">{Number(l.quantity_kg)} kg</p>
                    <div className="mt-3 flex items-center gap-2">
                      <PriceChip amount={Number(l.offer_price ?? 0)} size="sm" />
                      {l.is_organic && <Badge tone="success">Organic</Badge>}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
