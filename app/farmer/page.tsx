import { createClient } from "@/lib/supabase/server";
import { FairnessBadge } from "@/components/FairnessBadge";
import type { Listing } from "@/lib/types";

/**
 * Farmer dashboard. Server Component — reads the farmer's own listings via the
 * user-scoped server client (RLS). The "create listing" form is left as a
 * client component to wire up next; the API (POST /api/listings) is ready.
 */
export default async function FarmerDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("farmer_id", user!.id)
    .order("created_at", { ascending: false });

  const listings = (data ?? []) as Listing[];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My harvest listings</h1>
          <p className="text-sm text-zinc-600">
            Post a harvest and receive offers — you keep 100% of the agreed
            price.
          </p>
        </div>
        <FairnessBadge />
      </header>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">
          No listings yet. Create your first harvest contract via{" "}
          <code className="rounded bg-zinc-100 px-1">POST /api/listings</code>.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {listings.map((l) => (
            <li key={l.id} className="rounded-xl border border-zinc-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold capitalize">{l.crop}</h3>
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  {l.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                {l.quantity_kg} kg @ ₹{l.price_per_kg}/kg · harvest{" "}
                {l.harvest_date}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                {l.organic && <Tag>Organic</Tag>}
                {l.negotiable && <Tag>Negotiable</Tag>}
                {l.verified && <Tag>Verified</Tag>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5">{children}</span>
  );
}
