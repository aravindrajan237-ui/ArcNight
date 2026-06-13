import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, MessageCircleMore } from "lucide-react";
import { getMe } from "@/lib/session";
import { AppBar, Card, SuccessState, PrimaryButton, Button } from "@/components/ui";
import type { Deal, HarvestListing } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FarmerPayment({
  params,
}: {
  params: { dealId: string };
}) {
  const { supabase, user } = await getMe();

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", params.dealId)
    .single();
  if (!deal || deal.farmer_id !== user.id) notFound();
  const d = deal as Deal;

  const { data: listing } = await supabase
    .from("harvest_listings")
    .select("crop, quantity_kg")
    .eq("id", d.listing_id)
    .single();
  const l = listing as Pick<HarvestListing, "crop" | "quantity_kg"> | null;

  const total = Number(d.total_amount);
  const advance = Number(d.advance_amount);
  const balance = +(total - advance).toFixed(2);
  const paid = d.advance_paid;

  return (
    <div>
      <AppBar title="Deal" back="/farmer" />
      <main className="mx-auto max-w-md px-5 pb-12 pt-10">
        {paid ? (
          <SuccessState
            title="Advance received"
            amount={`₹${advance.toLocaleString("en-IN")}`}
            subtitle={`Your harvest is reserved. Balance ₹${balance.toLocaleString("en-IN")} on delivery.`}
            actions={
              <>
                {d.agreement_pdf_url ? (
                  <a href={d.agreement_pdf_url} target="_blank" rel="noreferrer">
                    <PrimaryButton fullWidth leftIcon={<Download className="h-5 w-5" />}>
                      Download agreement (PDF)
                    </PrimaryButton>
                  </a>
                ) : (
                  <PrimaryButton fullWidth disabled>
                    Agreement generating…
                  </PrimaryButton>
                )}
                <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-success">
                  <MessageCircleMore className="h-4 w-4" /> Receipt sent to your WhatsApp ✓
                </p>
              </>
            }
          >
            <Card inset className="text-left">
              <Row label="Crop" value={`${l?.crop ?? "—"} · ${Number(d.final_qty_kg)} kg`} />
              <Row label="Final price" value={`₹${Number(d.final_price)}/kg`} />
              <Row label="Total" value={`₹${total.toLocaleString("en-IN")}`} />
              <Row label="Advance (15%)" value={`₹${advance.toLocaleString("en-IN")}`} />
              <Row label="Balance on delivery" value={`₹${balance.toLocaleString("en-IN")}`} />
              <Row label="Platform commission" value="₹0 (0%)" highlight />
            </Card>
          </SuccessState>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-ink">
              Waiting for advance
            </h1>
            <p className="mt-2 text-slate">
              You&apos;ve accepted and signed. We&apos;ll notify you the moment the
              buyer pays the 15% advance.
            </p>
            <Card inset className="mt-6 text-left">
              <Row label="Crop" value={`${l?.crop ?? "—"} · ${Number(d.final_qty_kg)} kg`} />
              <Row label="Total" value={`₹${total.toLocaleString("en-IN")}`} />
              <Row label="Advance due" value={`₹${advance.toLocaleString("en-IN")}`} />
            </Card>
            <Link href="/farmer" className="mt-6 block">
              <Button variant="outline" fullWidth>Back to home</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-mist py-2.5 last:border-0">
      <span className="text-sm text-slate">{label}</span>
      <span className={`text-sm font-bold ${highlight ? "text-success" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}
