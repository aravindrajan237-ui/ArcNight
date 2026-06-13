"use client";

import { Languages } from "lucide-react";
import { useLocale, useSetLocale } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { cn } from "@/lib/cn";

/**
 * Language switcher — updates the locale instantly (client) and re-renders
 * server components via the cookie. Compact pill group.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const current = useLocale();
  const setLocale = useSetLocale();
  return (
    <div className={cn("flex items-center gap-1 rounded-pill bg-mist p-1", className)}>
      <Languages className="ml-1.5 h-4 w-4 text-slate" />
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => l !== current && setLocale(l)}
          className={cn(
            "rounded-pill px-2.5 py-1 text-sm font-bold transition",
            l === current ? "bg-white text-primary shadow-soft" : "text-slate hover:text-ink",
          )}
        >
          {LOCALE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
