"use client";

import { Home, Sprout, MessageCircle, User } from "lucide-react";
import { BottomNav, Sidebar, type NavItem } from "@/components/ui";
import { ToastProvider } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n/client";
import { DemoBar } from "@/components/demo/DemoControls";

/** Farmer shell: desktop sidebar + mobile bottom nav. Gated to role=farmer by middleware. */
export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useT();
  const nav: NavItem[] = [
    { href: "/farmer", label: t("nav.home"), icon: Home },
    { href: "/farmer/listings", label: t("nav.listings"), icon: Sprout },
    { href: "/farmer/chat", label: t("nav.chat"), icon: MessageCircle },
    { href: "/farmer/profile", label: t("nav.profile"), icon: User },
  ];
  return (
    <ToastProvider>
      <DemoBar />
      <div className="flex min-h-screen bg-surface">
        <Sidebar items={nav} />
        <div className="flex-1 pb-[76px] md:pb-0">{children}</div>
        <BottomNav items={nav} />
      </div>
    </ToastProvider>
  );
}
