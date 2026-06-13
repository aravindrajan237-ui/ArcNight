import { handle, ok } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

// Reads live data per request — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * GET /api/leaderboard — public stats over the migration `deals` table:
 *  - top_farmers / top_buyers: by number of paid/fulfilled deals (+ total value)
 *  - top_crops: most-bought crops by total quantity (joined via harvest_listings)
 */
export const GET = handle(async () => {
  const admin = createAdminClient();

  const { data: deals, error } = await admin
    .from("deals")
    .select("farmer_id, buyer_id, listing_id, total_amount, final_qty_kg, status")
    .in("status", ["advance_paid", "fulfilled"]);
  if (error) throw new Error(error.message);

  // crop per listing
  const listingIds = [...new Set((deals ?? []).map((d) => d.listing_id))];
  const { data: listings } = listingIds.length
    ? await admin.from("harvest_listings").select("id, crop").in("id", listingIds)
    : { data: [] as { id: string; crop: string }[] };
  const cropOf = (id: string) =>
    listings?.find((l) => l.id === id)?.crop ?? "crop";

  type Agg = { id: string; deals: number; value: number };
  const farmers = new Map<string, Agg>();
  const buyers = new Map<string, Agg>();
  const crops = new Map<string, { crop: string; quantity_kg: number; deals: number }>();

  for (const d of deals ?? []) {
    const total = Number(d.total_amount);
    const qty = Number(d.final_qty_kg);

    const f = farmers.get(d.farmer_id) ?? { id: d.farmer_id, deals: 0, value: 0 };
    f.deals++;
    f.value += total;
    farmers.set(d.farmer_id, f);

    const b = buyers.get(d.buyer_id) ?? { id: d.buyer_id, deals: 0, value: 0 };
    b.deals++;
    b.value += total;
    buyers.set(d.buyer_id, b);

    const crop = cropOf(d.listing_id);
    const c = crops.get(crop) ?? { crop, quantity_kg: 0, deals: 0 };
    c.quantity_kg += qty;
    c.deals++;
    crops.set(crop, c);
  }

  const ids = [...new Set([...farmers.keys(), ...buyers.keys()])];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, photo_url, trust_score")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const nameOf = (id: string) =>
    profiles?.find((p) => p.id === id)?.full_name ?? "Anonymous";
  const photoOf = (id: string) =>
    profiles?.find((p) => p.id === id)?.photo_url ?? null;
  const trustOf = (id: string) =>
    profiles?.find((p) => p.id === id)?.trust_score ?? 0;

  const top = (m: Map<string, Agg>) =>
    [...m.values()]
      .sort((a, b) => b.deals - a.deals || b.value - a.value)
      .slice(0, 10)
      .map((x) => ({
        id: x.id,
        name: nameOf(x.id),
        photo_url: photoOf(x.id),
        trust_score: trustOf(x.id),
        deals: x.deals,
        total_value: +x.value.toFixed(2),
      }));

  const topCrops = [...crops.values()]
    .sort((a, b) => b.quantity_kg - a.quantity_kg)
    .slice(0, 10)
    .map((c) => ({ ...c, quantity_kg: +c.quantity_kg.toFixed(2) }));

  return ok({
    top_farmers: top(farmers),
    top_buyers: top(buyers),
    top_crops: topCrops,
  });
});
