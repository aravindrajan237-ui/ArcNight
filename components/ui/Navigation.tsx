"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "./AppBar";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

function isActive(pathname: string, href: string) {
  if (href === "/farmer" || href === "/buyer") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Mobile bottom navigation (large 56px+ tap targets, icon-led). Hidden on
 * desktop where the Sidebar takes over.
 */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-mist bg-white/95 backdrop-blur-md md:hidden">
      <ul
        className="mx-auto grid max-w-lg"
        style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      >
        {items.map(({ href, label, icon: Icon, badge }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                className="relative flex h-[64px] flex-col items-center justify-center gap-1"
              >
                <span className="relative">
                  <Icon
                    className={cn(
                      "h-6 w-6 transition-colors",
                      active ? "text-primary" : "text-slate",
                    )}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {!!badge && badge > 0 && (
                    <span className="absolute -right-2.5 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-accent px-1 text-[10px] font-bold leading-none text-white">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    active ? "text-primary" : "text-slate",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Desktop left sidebar. Hidden on mobile where the BottomNav takes over. */
export function Sidebar({
  items,
  footer,
}: {
  items: NavItem[];
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-mist bg-white px-4 py-6 md:flex">
      <div className="px-2">
        <Logo size="md" />
      </div>
      <nav className="mt-8 flex-1">
        <ul className="space-y-1.5">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-semibold transition-colors",
                    active
                      ? "bg-primary-50 text-primary-700"
                      : "text-slate hover:bg-mist hover:text-ink",
                  )}
                >
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={active ? 2.4 : 2}
                  />
                  <span className="flex-1">{label}</span>
                  {!!badge && badge > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent px-1.5 text-xs font-bold text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {footer && <div className="mt-auto px-1">{footer}</div>}
    </aside>
  );
}
