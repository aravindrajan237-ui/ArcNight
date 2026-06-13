import { cookies } from "next/headers";
import { translate, type TFunc } from "./index";
import { DEFAULT_LOCALE, LOCALE_COOKIE, LOCALES, type Locale } from "./config";

/** Resolve the active locale from the cookie (server components / routes). */
export function getLocale(): Locale {
  const c = cookies().get(LOCALE_COOKIE)?.value as Locale | undefined;
  return c && LOCALES.includes(c) ? c : DEFAULT_LOCALE;
}

/** Bound translator for server components: `const t = getT(); t("key")`. */
export function getT(): TFunc {
  const locale = getLocale();
  return (key, vars) => translate(locale, key, vars);
}
