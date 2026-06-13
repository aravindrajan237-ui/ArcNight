import { handle, ok } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

// Reads live data per request — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * GET /api/leaderboard — public stats:
 *  - top_farmers: by number of fulfilled/advance-paid deals (+ total value)
 *  - top_buyers:  by number of deals (+ total value)
 *  - top_crops:   most-bought crops by total quantity
 *
 * Computed in JS over the deals table for hackathon simplicity. For scale this
 * would become a Postgres view / materialized aggregate.
 */
export const GET = handle(async () => {
  const admin = createAdminClient();

  const { data: deals, error } = await admin
    .from("deals")
    .select(
      "farmer_id, buyer_id, crop, quantity_kg, total_amount, status",
    )
    .in("status", ["advance_paid", "fulfilled"]);

  if (error) throw new Error(error.message);

  type Agg = { id: string; deals: number; value: number };
  const farmers = new Map<string, Agg>();
  const buyers = new Map<string, Agg>();
  const crops = new Map<string, { crop: string; quantity_kg: number; deals: number }>();

  for (const d of deals ?? []) {
    const total = Number(d.total_amount);
    const qty = Number(d.quantity_kg);

    const f = farmers.get(d.farmer_id) ?? { id: d.farmer_id, deals: 0, value: 0 };
    f.deals++;
    f.value += total;
    farmers.set(d.farmer_id, f);

    const b = buyers.get(d.buyer_id) ?? { id: d.buyer_id, deals: 0, value: 0 };
    b.deals++;
    b.value += total;
    buyers.set(d.buyer_id, b);

    const c = crops.get(d.crop) ?? { crop: d.crop, quantity_kg: 0, deals: 0 };
    c.quantity_kg += qty;
    c.deals++;
    crops.set(d.crop, c);
  }

  // Resolve names for the people leaderboards.
  const ids = [...new Set([...farmers.keys(), ...buyers.keys()])];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, location_label")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const nameOf = (id: string) =>
    profiles?.find((p) => p.id === id)?.full_name ?? "Anonymous";
  const placeOf = (id: string) =>
    profiles?.find((p) => p.id === id)?.location_label ?? null;

  const top = (m: Map<string, Agg>) =>
    [...m.values()]
      .sort((a, b) => b.deals - a.deals || b.value - a.value)
      .slice(0, 10)
      .map((x) => ({
        id: x.id,
        name: nameOf(x.id),
        location: placeOf(x.id),
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
