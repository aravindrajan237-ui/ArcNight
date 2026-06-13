import { messages } from "./messages";
import { DEFAULT_LOCALE, type Locale } from "./config";

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

/** Pure translator. Falls back to English, then to the raw key. */
export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const dict = messages[locale] ?? messages[DEFAULT_LOCALE];
  let s = dict[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}
