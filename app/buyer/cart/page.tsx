"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2, Minus, Plus, Sprout, BadgePercent } from "lucide-react";
import {
  AppBar,
  Card,
  Button,
  PrimaryButton,
  PriceChip,
  EmptyState,
  useToast,
} from "@/components/ui";
import { useCart } from "@/lib/cart";
import { capitalize } from "@/lib/format";
import { useT } from "@/lib/i18n/client";

export default function CartPage() {
  const cart = useCart();
  const router = useRouter();
  const toast = useToast();
  const t = useT();
  const [busy, setBusy] = useState(false);

  // Live availability for each cart item: a listing someone else has already
  // reserved/bought is "out of stock"; one past its harvest date is "expired".
  type Live = { status: string; expected_harvest_date: string | null };
  const [live, setLive] = useState<Record<string, Live>>({});
  const today = new Date().toISOString().slice(0, 10);

  const ids = cart.items.map((i) => i.listingId).join(",");
  useEffect(() => {
    const idList = ids ? ids.split(",") : [];
    if (idList.length === 0) {
      setLive({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/listings/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: idList }),
        });
        const json = await res.json();
        if (!cancelled && res.ok) setLive(json.data?.statuses ?? {});
      } catch {
        /* leave items available if the check fails */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  // status: null = available, "sold" = bought by someone, "expired" = past date
  function availability(listingId: string): null | "sold" | "expired" {
    const s = live[listingId];
    if (!s) return null;
    if (s.status !== "open") return "sold";
    if (s.expected_harvest_date && s.expected_harvest_date < today) return "expired";
    return null;
  }

  const buyableCount = useMemo(
    () => cart.items.filter((i) => availability(i.listingId) === null).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cart.items, live, today],
  );

  async function checkout() {
    if (cart.items.length === 0) return;
    const buyable = cart.items.filter((i) => availability(i.listingId) === null);
    if (buyable.length === 0) {
      toast.error(t("cart.noneAvailable"));
      return;
    }
    setBusy(true);
    try {
      // Reserve every available cart item (creates an offer at the asking price).
      const results = await Promise.allSettled(
        buyable.map((i) =>
          fetch("/api/offers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              listing_id: i.listingId,
              proposed_price: i.price,
              proposed_qty_kg: i.qty,
            }),
          }).then((r) => {
            if (!r.ok) throw new Error();
          }),
        ),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      if (ok === 0) throw new Error("All reservations failed");
      cart.clear();
      toast.success(
        "Reservations sent 🎉",
        `${ok} item${ok > 1 ? "s" : ""} sent to farmers. Track them in Orders.`,
      );
      router.push("/buyer/orders");
    } catch (e) {
      toast.error("Checkout failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AppBar title={t("cart.title")} back="/buyer" />
      <main className="mx-auto max-w-2xl px-4 pb-40 pt-6 sm:px-6">
        {cart.items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart className="h-7 w-7" />}
            title={t("cart.empty")}
            description={t("cart.emptySub")}
            action={
              <Link href="/buyer">
                <PrimaryButton>{t("cart.browse")}</PrimaryButton>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {cart.items.map((i) => {
              const avail = availability(i.listingId);
              return (
              <Card key={i.listingId} inset className={avail ? "opacity-75" : undefined}>
                <div className="flex items-center gap-3">
                  {i.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.photoUrl} alt={i.crop} className="h-16 w-16 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-50 text-primary">
                      <Sprout className="h-6 w-6" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-ink">{capitalize(i.crop)}</p>
                      {avail === "sold" && (
                        <span className="rounded-pill bg-danger-50 px-2 py-0.5 text-xs font-bold text-danger">
                          {t("cart.outOfStock")}
                        </span>
                      )}
                      {avail === "expired" && (
                        <span className="rounded-pill bg-warning-50 px-2 py-0.5 text-xs font-bold text-warning">
                          {t("cart.expired")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate">
                      ₹{i.price}/kg · {i.farmerName}
                    </p>
                  </div>
                  <button
                    onClick={() => cart.remove(i.listingId)}
                    aria-label="Remove"
                    className="rounded-xl p-2 text-slate transition hover:bg-mist hover:text-danger"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cart.update(i.listingId, i.qty - 10)}
                      aria-label="decrease"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-mist text-primary active:scale-95"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={i.qty}
                      onChange={(e) => cart.update(i.listingId, Number(e.target.value))}
                      className="h-9 w-16 rounded-lg border border-mist px-2 text-center font-bold tabular-nums outline-none"
                    />
                    <span className="text-sm text-slate">/ {i.available} kg</span>
                    <button
                      onClick={() => cart.update(i.listingId, i.qty + 10)}
                      aria-label="increase"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-mist text-primary active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <PriceChip amount={i.qty * i.price} unit="" />
                </div>
              </Card>
              );
            })}

            <Card inset className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate">Subtotal</span>
                <span className="text-xl font-extrabold text-ink">
                  ₹{cart.subtotal.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-primary-50 px-3 py-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-primary-700">
                  <BadgePercent className="h-4 w-4" /> Platform commission
                </span>
                <span className="text-sm font-extrabold text-primary-700">₹0 (0%)</span>
              </div>
            </Card>
          </div>
        )}
      </main>

      {cart.items.length > 0 && (
        <div className="fixed inset-x-0 bottom-[64px] z-20 border-t border-mist bg-white/95 p-4 backdrop-blur md:bottom-0 md:pl-64">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-slate">{t("cart.total")}</p>
              <p className="text-lg font-extrabold text-ink">
                ₹{cart.subtotal.toLocaleString("en-IN")}
              </p>
            </div>
            <Button size="lg" loading={busy} onClick={checkout} disabled={buyableCount === 0}>
              {t("cart.reserveAll")} ({buyableCount})
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
