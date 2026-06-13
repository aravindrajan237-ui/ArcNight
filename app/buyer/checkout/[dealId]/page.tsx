import { notFound, redirect } from "next/navigation";
import { getMe } from "@/lib/session";
import { AppBar } from "@/components/ui";
import { CheckoutClient } from "@/components/buyer/CheckoutClient";
import { ReportButton } from "@/components/ReportButton";
import { getT } from "@/lib/i18n/server";
import type { Deal, HarvestListing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BuyerCheckout({
  params,
}: {
  params: { dealId: string };
}) {
  const t = getT();
  const { supabase, user } = await getMe();

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", params.dealId)
    .single();
  if (!deal || deal.buyer_id !== user.id) notFound();
  const d = deal as Deal;

  // Already paid → straight to the order.
  if (d.advance_paid) redirect("/buyer/orders");

  const { data: listing } = await supabase
    .from("harvest_listings")
    .select("crop")
    .eq("id", d.listing_id)
    .single();
  const crop = (listing as Pick<HarvestListing, "crop"> | null)?.crop ?? "harvest";

  const total = Number(d.total_amount);
  const advance = Number(d.advance_amount);

  return (
    <div>
      <AppBar title={t("co.title")} back="/buyer/orders" />
      <main className="mx-auto max-w-md px-5 pb-16 pt-6">
        <CheckoutClient
          dealId={d.id}
          crop={crop}
          qty={Number(d.final_qty_kg)}
          finalPrice={Number(d.final_price)}
          total={total}
          advance={advance}
          balance={+(total - advance).toFixed(2)}
        />
        <div className="mt-6 flex justify-center">
          <ReportButton dealId={d.id} label={t("co.reportIssue")} variant="ghost" />
        </div>
      </main>
    </div>
  );
}
