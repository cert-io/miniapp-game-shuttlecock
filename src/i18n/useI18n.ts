import { useMemo } from "react";
import { translations, type Locale, type TranslationKey } from "./translations";

const detectLocale = (): Locale => {
  if (typeof navigator === "undefined") return "en";
  const lang = (navigator.language || "en").toLowerCase();
  const base = lang.split("-")[0] as Locale;
  return base in translations ? base : "en";
};

export function useI18n() {
  const locale = useMemo(() => detectLocale(), []);

  const t = useMemo(() => {
    return (key: TranslationKey): string => {
      const dict = translations[locale] ?? translations.en;
      return (dict as Record<string, string>)[key] ?? translations.en[key] ?? key;
    };
  }, [locale]);

  return { locale, t };
}

