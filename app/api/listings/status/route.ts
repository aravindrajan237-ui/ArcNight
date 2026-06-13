import { z } from "zod";
import { handle, ok, parseBody } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";

// Live availability lookup for cart items — never prerender.
export const dynamic = "force-dynamic";

/**
 * POST /api/listings/status  { ids: string[] }
 *
 * Returns the current availability of each listing so the cart can show
 * "out of stock" (already reserved/bought by someone) or "expired" (past the
 * expected harvest date). Returns: { statuses: Record<id, {status, expected_harvest_date}> }
 */
const bodySchema = z.object({
  ids: z.array(z.string().uuid()).max(100),
});

export const POST = handle(async (req) => {
  const { ids } = await parseBody(req, bodySchema);
  if (ids.length === 0) return ok({ statuses: {} });

  const admin = createAdminClient();
  const { data } = await admin
    .from("harvest_listings")
    .select("id, status, expected_harvest_date")
    .in("id", ids);

  const statuses: Record<string, { status: string; expected_harvest_date: string | null }> = {};
  for (const row of data ?? []) {
    statuses[row.id as string] = {
      status: (row.status as string) ?? "open",
      expected_harvest_date: (row.expected_harvest_date as string | null) ?? null,
    };
  }
  return ok({ statuses });
});
