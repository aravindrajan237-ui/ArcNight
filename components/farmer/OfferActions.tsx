"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Repeat } from "lucide-react";
import {
  Button,
  Input,
  Card,
  PriceChip,
  useToast,
} from "@/components/ui";
import { useT } from "@/lib/i18n/client";

/**
 * Accept / Counter / Reject controls for one incoming offer.
 * Accept also creates + e-signs the deal (POST /api/deals) so the buyer can pay.
 */
export function OfferActions({
  offerId,
  buyerName,
  proposedPrice,
  proposedQty,
}: {
  offerId: string;
  buyerName: string;
  proposedPrice: number;
  proposedQty: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const [busy, setBusy] = useState<"accept" | "reject" | "counter" | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [counterPrice, setCounterPrice] = useState(proposedPrice);
  const [counterNote, setCounterNote] = useState("");

  async function respond(body: Record<string, unknown>, kind: typeof busy) {
    const res = await fetch(`/api/offers/${offerId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? `Could not ${kind} offer`);
    return json;
  }

  async function accept() {
    setBusy("accept");
    try {
      await respond({ action: "accept" }, "accept");
      // Create + e-sign the deal so the buyer can pay the advance.
      const dealRes = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offerId, esign: true }),
      });
      const dealJson = await dealRes.json();
      if (!dealRes.ok) throw new Error(dealJson.error ?? "Deal creation failed");
      toast.success("Offer accepted & signed", "Waiting for the buyer's advance.");
      router.refresh();
    } catch (e) {
      toast.error("Couldn't accept", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy("reject");
    try {
      await respond({ action: "reject" }, "reject");
      toast.info("Offer declined");
      router.refresh();
    } catch (e) {
      toast.error("Couldn't decline", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  async function counter() {
    setBusy("counter");
    try {
      await respond(
        {
          action: "counter",
          counter_price_per_kg: counterPrice,
          counter_quantity_kg: proposedQty,
          message: counterNote || undefined,
        },
        "counter",
      );
      toast.success("Counter sent", `₹${counterPrice}/kg to ${buyerName}`);
      setShowCounter(false);
      router.refresh();
    } catch (e) {
      toast.error("Couldn't counter", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex gap-2">
        <Button
          size="sm"
          fullWidth
          loading={busy === "accept"}
          onClick={accept}
          leftIcon={<Check className="h-4 w-4" />}
        >
          {t("off.accept")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          fullWidth
          onClick={() => setShowCounter((s) => !s)}
          leftIcon={<Repeat className="h-4 w-4" />}
        >
          {t("off.counter")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          loading={busy === "reject"}
          onClick={reject}
          aria-label="Reject"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {showCounter && (
        <Card inset className="space-y-3 bg-mist/40">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{t("off.yourCounter")}</span>
            <PriceChip amount={counterPrice} />
          </div>
          <Input
            type="number"
            label={t("off.counterPrice")}
            value={counterPrice}
            onChange={(e) => setCounterPrice(Number(e.target.value))}
          />
          <Input
            label={t("off.note")}
            placeholder="e.g. Best I can do for this quality"
            value={counterNote}
            onChange={(e) => setCounterNote(e.target.value)}
          />
          <Button
            fullWidth
            loading={busy === "counter"}
            onClick={counter}
          >
            {t("off.sendCounter")}
          </Button>
        </Card>
      )}
    </div>
  );
}
