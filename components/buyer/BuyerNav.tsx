"use client";

import { Store, ShoppingCart, MessageCircle, Receipt, User } from "lucide-react";
import { BottomNav, Sidebar, type NavItem } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { useT } from "@/lib/i18n/client";

/** Buyer navigation with a live cart-count badge. */
export function BuyerNav() {
  const cart = useCart();
  const t = useT();
  const nav: NavItem[] = [
    { href: "/buyer", label: t("nav.browse"), icon: Store },
    { href: "/buyer/cart", label: t("nav.cart"), icon: ShoppingCart, badge: cart.count },
    { href: "/buyer/chat", label: t("nav.chats"), icon: MessageCircle },
    { href: "/buyer/orders", label: t("nav.orders"), icon: Receipt },
    { href: "/buyer/profile", label: t("nav.profile"), icon: User },
  ];
  return (
    <>
      <Sidebar items={nav} />
      <BottomNav items={nav} />
    </>
  );
}
