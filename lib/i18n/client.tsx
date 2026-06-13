"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { translate, type TFunc } from "./index";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nCtx>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

/**
 * Reactive i18n. The locale lives in client state (seeded from the cookie that
 * the server read), so changing it updates client components instantly; we also
 * write the cookie + router.refresh() so server components re-render in the new
 * language without a full page reload (preserving form state).
 */
export function I18nProvider({
  locale: initial,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLoc] = useState<Locale>(initial);

  function setLocale(l: Locale) {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=31536000;samesite=lax`;
    setLoc(l);
    router.refresh();
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

export function useSetLocale(): (l: Locale) => void {
  return useContext(I18nContext).setLocale;
}

/** Client translator hook: `const t = useT(); t("key")`. */
export function useT(): TFunc {
  const { locale } = useContext(I18nContext);
  return (key, vars) => translate(locale, key, vars);
}
