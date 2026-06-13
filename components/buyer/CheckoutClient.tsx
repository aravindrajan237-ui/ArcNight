"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, BadgePercent, Download, Lock } from "lucide-react";
import {
  Card,
  Button,
  SuccessState,
  PrimaryButton,
  useToast,
} from "@/components/ui";
import { useT } from "@/lib/i18n/client";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutClient({
  dealId,
  crop,
  qty,
  finalPrice,
  total,
  advance,
  balance,
}: {
  dealId: string;
  crop: string;
  qty: number;
  finalPrice: number;
  total: number;
  advance: number;
  balance: number;
}) {
  const toast = useToast();
  const t = useT();
  const [signed, setSigned] = useState(false);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  async function pay() {
    if (!signed) {
      toast.info(t("co.signFirst"));
      return;
    }
    setPaying(true);
    try {
      const orderRes = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not create order");

      const okScript = await loadRazorpay();
      if (!okScript) throw new Error("Couldn't load payment gateway");

      const rzp = new (window as any).Razorpay({
        key: order.data.key_id,
        order_id: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        name: "HarvestLink",
        description: `Advance for ${crop} (${qty} kg)`,
        theme: { color: "#1F6B3B" },
        handler: async (resp: RazorpayResponse) => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                deal_id: dealId,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            });
            const v = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(v.error ?? "Verification failed");
            setPdfUrl(v.data.agreement_pdf_url ?? null);
            setDone(true);
            toast.success("Advance paid 🎉", "Your agreement is ready to download.");
          } catch (e) {
            toast.error("Verification failed", e instanceof Error ? e.message : undefined);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (e) {
      toast.error("Payment error", e instanceof Error ? e.message : undefined);
      setPaying(false);
    }
  }

  if (done) {
    return (
      <SuccessState
        title={t("co.paid")}
        amount={`₹${advance.toLocaleString("en-IN")}`}
        subtitle={t("co.paidSub")}
        actions={
          <>
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <PrimaryButton fullWidth leftIcon={<Download className="h-5 w-5" />}>
                  {t("co.downloadPdf")}
                </PrimaryButton>
              </a>
            )}
            <Link href="/buyer/orders">
              <Button variant="outline" fullWidth>{t("co.goOrders")}</Button>
            </Link>
            <p className="text-sm font-semibold text-success">{t("co.ready")}</p>
          </>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card inset className="space-y-1">
        <Row label={t("co.crop")} value={`${crop} · ${qty} kg`} />
        <Row label={t("co.finalPrice")} value={`₹${finalPrice}/kg`} />
        <Row label={t("co.total")} value={`₹${total.toLocaleString("en-IN")}`} />
        <div className="my-2 border-t border-mist" />
        <Row label={t("co.advanceNow")} value={`₹${advance.toLocaleString("en-IN")}`} strong />
        <Row label={t("co.balance")} value={`₹${balance.toLocaleString("en-IN")}`} />
        <div className="mt-2 flex items-center justify-between rounded-xl bg-primary-50 px-3 py-2">
          <span className="flex items-center gap-1.5 text-sm font-bold text-primary-700">
            <BadgePercent className="h-4 w-4" /> {t("co.commission")}
          </span>
          <span className="text-sm font-extrabold text-primary-700">₹0 (0%)</span>
        </div>
      </Card>

      {/* E-sign */}
      <button
        onClick={() => setSigned((s) => !s)}
        className="flex w-full items-start gap-3 rounded-2xl border border-mist bg-white p-4 text-left"
      >
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
            signed ? "border-primary bg-primary text-white" : "border-mist"
          }`}
        >
          {signed && <ShieldCheck className="h-4 w-4" />}
        </span>
        <span className="text-sm text-ink">
          {t("co.esign")}
        </span>
      </button>

      <Button
        size="xl"
        fullWidth
        loading={paying}
        disabled={!signed}
        onClick={pay}
        leftIcon={<Lock className="h-5 w-5" />}
      >
        {t("co.pay")} ₹{advance.toLocaleString("en-IN")}
      </Button>
      <p className="text-center text-xs text-slate">
        {t("co.payNote")}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-slate">{label}</span>
      <span className={`text-sm ${strong ? "font-extrabold text-ink" : "font-semibold text-ink"}`}>
        {value}
      </span>
    </div>
  );
}
