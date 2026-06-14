"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, MessageCircle, ShoppingCart, Minus, Plus } from "lucide-react";
import { Button, PriceChip, useToast } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

/**
 * Buyer actions on a contract. The buyer chooses a quantity (1..available),
 * then can add it to cart or reserve it directly (creates an offer at the
 * asking price for the chosen quantity). "Negotiate" opens the chat.
 */
export function ReserveButton({
  listingId,
  crop,
  price,
  available,
  photoUrl,
  farmerName,
  chatHref,
}: {
  listingId: string;
  crop: string;
  price: number;
  available: number;
  photoUrl: string | null;
  farmerName: string;
  chatHref: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const cart = useCart();
  const t = useT();
  const [qty, setQty] = useState(available);
  const [busy, setBusy] = useState(false);

  // Allow fractional kg (e.g. 20.5), keep 2 decimals, clamp to 1..available.
  const clamp = (v: number) =>
    Math.round(Math.min(available, Math.max(1, v || 1)) * 100) / 100;

  async function reserve() {
    if (qty > available) {
      toast.error("Too much", `Only ${available} kg available.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          proposed_price: price,
          proposed_qty_kg: qty,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not reserve");
      toast.success("Reservation sent", "Track it under Orders once the farmer accepts.");
      router.push("/buyer/orders");
    } catch (e) {
      toast.error("Couldn't reserve", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  function addToCart() {
    if (qty > available) {
      toast.error("Too much", `Only ${available} kg available.`);
      return;
    }
    cart.add({ listingId, crop, price, available, photoUrl, farmerName, qty });
    toast.success("Added to cart", `${qty} kg of ${crop}`);
  }

  return (
    <div className="space-y-3">
      {/* Quantity selector */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">
          {t("detail.quantity")}
          <span className="ml-1 font-normal text-slate">({available} kg {t("card.available")})</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="decrease"
            onClick={() => setQty((q) => clamp(q - 10))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-mist text-primary active:scale-95"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            value={qty}
            onChange={(e) => setQty(clamp(Number(e.target.value)))}
            className={cn(
              "h-10 w-20 rounded-xl border px-2 text-center font-bold tabular-nums outline-none",
              qty > available ? "border-danger" : "border-mist",
            )}
          />
          <button
            type="button"
            aria-label="increase"
            onClick={() => setQty((q) => clamp(q + 10))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-mist text-primary active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate">{t("detail.subtotal")}</span>
        <PriceChip amount={qty * price} unit="" />
      </div>

      {/* Actions */}
      <div className="flex gap-2.5">
        <Button variant="outline" onClick={addToCart} leftIcon={<ShoppingCart className="h-5 w-5" />}>
          {t("act.add")}
        </Button>
        <Button fullWidth loading={busy} onClick={reserve} leftIcon={<Lock className="h-5 w-5" />}>
          {t("act.reserve")} · ₹{price}/kg
        </Button>
        <Link href={chatHref} className="shrink-0">
          <Button variant="ghost" aria-label="Negotiate">
            <MessageCircle className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
