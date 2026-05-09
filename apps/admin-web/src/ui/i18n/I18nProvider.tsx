import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { LOCALES, translations, type Locale } from "./translations";

const localeKey = "serverless-agent:locale";

type I18nContextValue = {
  locale: Locale;
  locales: typeof LOCALES;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
    localStorage.setItem(localeKey, nextLocale);
    document.documentElement.lang = nextLocale;
  }

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      locales: LOCALES,
      setLocale,
      t: (key, vars) => format(translations[locale][key] ?? key, vars)
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }

  return context;
}

function detectInitialLocale(): Locale {
  const stored = localStorage.getItem(localeKey);
  if (stored === "zh-CN" || stored === "en-US") {
    document.documentElement.lang = stored;
    return stored;
  }

  const browserLocale = navigator.language.toLowerCase().startsWith("zh")
    ? "zh-CN"
    : "en-US";
  document.documentElement.lang = browserLocale;
  return browserLocale;
}

function format(
  template: string,
  vars: Record<string, string | number> = {}
): string {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}
