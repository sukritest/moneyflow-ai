"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "./dictionaries/en.json";
import th from "./dictionaries/th.json";

export type Locale = "en" | "th";

const dictionaries = { en, th } as const;

type Dictionary = typeof en;

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: Dictionary;
  /** Translate a dotted key path, e.g. t("dashboard.title"). */
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const STORAGE_KEY = "moneyflow-locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored === "en" || stored === "th") {
      setLocaleState(stored);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("th")) setLocaleState("th");
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }, []);

  const dict = dictionaries[locale];

  const t = useCallback(
    (key: string) => {
      const parts = key.split(".");
      let value: unknown = dict;
      for (const part of parts) {
        if (typeof value === "object" && value !== null && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          return key;
        }
      }
      return typeof value === "string" ? value : key;
    },
    [dict]
  );

  const ctx = useMemo(
    () => ({ locale, setLocale, dict, t }),
    [locale, setLocale, dict, t]
  );

  return <LocaleContext.Provider value={ctx}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
