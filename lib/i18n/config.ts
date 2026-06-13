export type Locale = "en" | "hi" | "ta";

export const LOCALES: Locale[] = ["en", "hi", "ta"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "hl_lang";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  ta: "தமிழ்",
};
