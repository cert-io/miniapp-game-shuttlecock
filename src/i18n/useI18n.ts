import { useEffect, useMemo, useState } from "react";
import { translations, type Locale, type TranslationKey } from "./translations";

const LOCALE_STORAGE_KEY = "miniapp_locale";
const LOCALE_CHANGED_EVENT = "miniapp:locale_changed";

const isLocale = (v: string | null | undefined): v is Locale => {
  if (!v) return false;
  return v === "ko" || v === "en";
};

/**
 * 언어 결정 우선순위:
 * 1) URL 파라미터 `lang` (예: ?lang=ko 또는 #/...?...&lang=en)
 * 2) localStorage `miniapp_locale`
 * 3) 브라우저 언어(navigator.language)
 */
const detectLocale = (): Locale => {
  try {
    if (typeof window !== "undefined") {
      const search = window.location.search || "";
      const hash = window.location.hash || "";

      // hash 안에 query가 들어오는 케이스 지원: "#/route?lang=ko"
      const hashQueryIndex = hash.indexOf("?");
      const hashQuery = hashQueryIndex >= 0 ? hash.slice(hashQueryIndex) : "";

      const sp = new URLSearchParams(search);
      const hp = new URLSearchParams(hashQuery);
      const fromParam = sp.get("lang") ?? hp.get("lang");
      if (isLocale(fromParam)) return fromParam;

      const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(saved)) return saved;
    }
  } catch {
    // ignore and fallback to navigator
  }

  // 기본 언어는 항상 English (파라미터/저장값이 있을 때만 변경)
  return "en";
};

export function useI18n() {
  const [locale, setLocale] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    const update = () => setLocale(detectLocale());

    // 다른 탭/창에서 바뀌는 경우
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCALE_STORAGE_KEY) update();
    };

    // 같은 탭에서 바뀌는 경우(커스텀 이벤트)
    const onLocaleChanged = () => update();

    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCALE_CHANGED_EVENT, onLocaleChanged as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCALE_CHANGED_EVENT, onLocaleChanged as EventListener);
    };
  }, []);

  const t = useMemo(() => {
    return (key: TranslationKey): string => {
      const dict = translations[locale] ?? translations.en;
      return (dict as Record<string, string>)[key] ?? translations.en[key] ?? key;
    };
  }, [locale]);

  return { locale, t };
}

export function notifyLocaleChanged() {
  try {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(LOCALE_CHANGED_EVENT));
  } catch {
    // noop
  }
}

