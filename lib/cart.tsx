"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Shopping cart (#9). Client-side, persisted to localStorage so it survives
 * refreshes. One entry per listing; quantity is clamped to available stock.
 */

export interface CartItem {
  listingId: string;
  crop: string;
  price: number; // ₹/kg
  available: number; // stock cap
  photoUrl: string | null;
  farmerName: string;
  qty: number;
}

interface CartApi {
  items: CartItem[];
  count: number; // distinct listings
  subtotal: number; // ₹
  add: (item: CartItem) => void;
  update: (listingId: string, qty: number) => void;
  remove: (listingId: string) => void;
  clear: () => void;
}

const KEY = "harvestlink.cart.v1";
const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // Load once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore corrupt cart */
    }
    setReady(true);
  }, []);

  // Persist on change (after initial load).
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* storage full / disabled — ignore */
    }
  }, [items, ready]);

  const api = useMemo<CartApi>(() => {
    const clampQty = (qty: number, available: number) =>
      Math.round(Math.min(available, Math.max(1, qty || 1)) * 100) / 100;

    return {
      items,
      count: items.length,
      subtotal: items.reduce((s, i) => s + i.price * i.qty, 0),
      add: (item) =>
        setItems((prev) => {
          const existing = prev.find((p) => p.listingId === item.listingId);
          if (existing) {
            return prev.map((p) =>
              p.listingId === item.listingId
                ? { ...p, qty: clampQty(p.qty + item.qty, p.available) }
                : p,
            );
          }
          return [...prev, { ...item, qty: clampQty(item.qty, item.available) }];
        }),
      update: (listingId, qty) =>
        setItems((prev) =>
          prev.map((p) =>
            p.listingId === listingId
              ? { ...p, qty: clampQty(qty, p.available) }
              : p,
          ),
        ),
      remove: (listingId) =>
        setItems((prev) => prev.filter((p) => p.listingId !== listingId)),
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
