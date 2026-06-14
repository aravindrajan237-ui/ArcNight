import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Download, Sprout, FileSignature, Wallet, BadgeIndianRupee, PartyPopper, Star } from "lucide-react";
import { getMe } from "@/lib/session";
import { AppBar, Card, PriceChip, Button, PrimaryButton, Avatar, StatusPill, type ListingStatus } from "@/components/ui";
import { getT } from "@/lib/i18n/server";
import { capitalize } from "@/lib/format";
import type { Deal, HarvestListing, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEAL_TO_PILL: Record<string, ListingStatus> = {
  awaiting_advance: "reserved",
  advance_paid: "paid",
  fulfilled: "fulfilled",
  cancelled: "cancelled",
};

export default async function OrderTracking({ params }: { params: { dealId: string } }) {
  const t = getT();
  const { supabase, user } = await getMe();

  const { data: deal } = await supabase
    .from("deals")
    .select("*")
    .eq("id", params.dealId)
    .single();
  if (!deal || deal.buyer_id !== user.id) notFound();
  const d = deal as Deal;

  const { data: listing } = await supabase
    .from("harvest_listings")
    .select("id, crop, crop_photo_url")
    .eq("id", d.listing_id)
    .single();
  const li = listing as Pick<HarvestListing, "id" | "crop" | "crop_photo_url"> | null;

  const { data: farmer } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url, trust_score, completed_deals")
    .eq("id", d.farmer_id)
    .single();
  const f = farmer as Partial<Profile> | null;

  const total = Number(d.total_amount);
  const advance = Number(d.advance_amount);
  const balance = +(total - advance).toFixed(2);
  const cancelled = d.status === "cancelled";
  const advanceDone = d.status === "advance_paid" || d.status === "fulfilled";
  const balanceDone = d.status === "fulfilled";
  const stars = (f?.trust_score ?? 0) / 20;

  const steps = [
    {
      done: true,
      icon: <FileSignature className="h-4 w-4" />,
      label: t("track.agreementSigned"),
      sub: new Date(d.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    },
    {
      done: advanceDone,
      icon: <Wallet className="h-4 w-4" />,
      label: t("track.advancePaid"),
      sub: `₹${advance.toLocaleString("en-IN")}`,
      action:
        !advanceDone && d.status === "awaiting_advance" ? (
          <Link href={`/buyer/checkout/${d.id}`}>
            <PrimaryButton size="sm">{t("act.payAdvance")}</PrimaryButton>
          </Link>
        ) : null,
    },
    {
      done: balanceDone,
      icon: <BadgeIndianRupee className="h-4 w-4" />,
      label: t("track.balancePaid"),
      sub: `₹${balance.toLocaleString("en-IN")}`,
      action:
        !balanceDone && advanceDone ? (
          <Link href={`/buyer/checkout/${d.id}?type=final`}>
            <PrimaryButton size="sm">{t("track.payBalance")}</PrimaryButton>
          </Link>
        ) : null,
    },
    {
      done: balanceDone,
      icon: <PartyPopper className="h-4 w-4" />,
      label: t("track.completed"),
    },
  ];

  return (
    <div>
      <AppBar title={t("track.title")} back="/buyer/orders" />
      <main className="mx-auto max-w-2xl space-y-5 px-4 pb-16 pt-6 sm:px-6">
        {/* Order header */}
        <Card inset>
          <div className="flex items-center gap-3">
            {li?.crop_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={li.crop_photo_url} alt={li.crop} className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-50 text-primary">
                <Sprout className="h-7 w-7" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold capitalize text-ink">{capitalize(li?.crop ?? "Harvest")}</p>
              <p className="text-sm text-slate">
                {Number(d.final_qty_kg)} kg · ₹{Number(d.final_price)}/kg
              </p>
            </div>
            <StatusPill status={DEAL_TO_PILL[d.status] ?? "reserved"} size="sm" />
          </div>
        </Card>

        {/* Status timeline */}
        <Card inset>
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate">{t("track.statusTitle")}</h2>
          <ol className="mt-3">
            {cancelled ? (
              <li className="flex items-center gap-3 py-2 text-danger">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-danger-50">✕</span>
                <span className="font-bold">{t("track.cancelled")}</span>
              </li>
            ) : (
              steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  {/* Rail */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        s.done ? "bg-primary text-white" : "bg-mist text-slate"
                      }`}
                    >
                      {s.done ? <Check className="h-4 w-4" /> : s.icon}
                    </span>
                    {i < steps.length - 1 && (
                      <span className={`my-1 w-0.5 flex-1 ${s.done ? "bg-primary/40" : "bg-mist"}`} />
                    )}
                  </div>
                  {/* Body */}
                  <div className="flex flex-1 items-start justify-between gap-3 pb-5">
                    <div>
                      <p className={`font-semibold ${s.done ? "text-ink" : "text-slate"}`}>{s.label}</p>
                      {s.sub && <p className="text-sm text-slate">{s.sub}</p>}
                    </div>
                    {s.action}
                  </div>
                </li>
              ))
            )}
          </ol>
        </Card>

        {/* Payment summary */}
        <Card inset className="space-y-1">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate">{t("track.summary")}</h2>
          <Row label={t("co.total")} value={`₹${total.toLocaleString("en-IN")}`} />
          <Row label={t("track.advancePaid")} value={`₹${advance.toLocaleString("en-IN")}`} done={advanceDone} />
          <Row label={t("track.balancePaid")} value={`₹${balance.toLocaleString("en-IN")}`} done={balanceDone} />
        </Card>

        {/* Seller */}
        <Link href={`/u/${d.farmer_id}`}>
          <Card interactive inset className="flex items-center gap-3">
            <Avatar name={f?.full_name} src={f?.photo_url} size="md" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink">{f?.full_name ?? "Farmer"}</p>
              <p className="flex items-center gap-1 text-sm text-slate">
                {(f?.completed_deals ?? 0) > 0 ? (
                  <>
                    <Star className="h-3.5 w-3.5 text-warning" fill="currentColor" />
                    {stars.toFixed(1)} · {f?.completed_deals} deals
                  </>
                ) : (
                  t("track.seller")
                )}
              </p>
            </div>
          </Card>
        </Link>

        {/* Agreement */}
        {d.agreement_pdf_url && (
          <a href={d.agreement_pdf_url} target="_blank" rel="noreferrer">
            <Button variant="outline" fullWidth leftIcon={<Download className="h-5 w-5" />}>
              {t("act.agreement")}
            </Button>
          </a>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, done }: { label: string; value: string; done?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="flex items-center gap-1.5 text-sm text-slate">
        {done !== undefined &&
          (done ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <span className="h-3.5 w-3.5 rounded-full border border-mist" />
          ))}
        {label}
      </span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
