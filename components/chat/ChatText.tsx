"use client";

import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

/**
 * Renders an incoming chat message (from the other party or the AI mediator),
 * auto-translated into the viewer's language. So if one user writes in Hindi
 * and the other reads in Tamil, each sees the conversation in their own
 * language. The original is one tap away.
 *
 * Results are cached per (locale, text) so re-renders and repeated phrases
 * don't re-hit the API. If translation is unavailable the original text is
 * shown unchanged — chat never breaks.
 */

const cache = new Map<string, { text: string; translated: boolean }>();

export function ChatText({ text }: { text: string }) {
  const locale = useLocale();
  const t = useT();
  const key = `${locale}::${text}`;
  const [result, setResult] = useState<{ text: string; translated: boolean } | null>(
    () => cache.get(key) ?? null,
  );
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (!text.trim()) return;
    const cached = cache.get(key);
    if (cached) {
      setResult(cached);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, target: locale as Locale }),
        });
        const json = await res.json();
        const out = res.ok
          ? { text: json.data?.text ?? text, translated: !!json.data?.translated }
          : { text, translated: false };
        cache.set(key, out);
        if (!cancelled) setResult(out);
      } catch {
        if (!cancelled) setResult({ text, translated: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key, text, locale]);

  // Not translated (same language) or still loading → just show the text.
  if (!result || !result.translated) return <>{text}</>;

  return (
    <span>
      {showOriginal ? text : result.text}
      <button
        onClick={() => setShowOriginal((v) => !v)}
        className="mt-1 flex items-center gap-1 text-[11px] font-semibold opacity-70 transition hover:opacity-100"
      >
        <Languages className="h-3 w-3" />
        {showOriginal ? t("chat.showTranslation") : t("chat.translated")}
      </button>
    </span>
  );
}
