"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_LANGUAGE,
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  type Language,
} from "@/lib/i18n/config";
import { messages, type TranslationKey } from "@/lib/i18n/messages";
import { AZ_TX_FALLBACK } from "@/lib/i18n/az-fallback";
import { RU_TX_FALLBACK } from "@/lib/i18n/ru-fallback";
import { TR_TX_FALLBACK } from "@/lib/i18n/tr-fallback";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
  tx: (en: string, tr?: string, ru?: string, az?: string) => string;
  tt: (en: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && isLanguage(saved)) {
      setLanguage(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: TranslationKey) => {
      return messages[language][key] ?? messages[DEFAULT_LANGUAGE][key];
    },
    [language],
  );

  const tx = useCallback(
    (en: string, tr?: string, ru?: string, az?: string) => {
      if (language === "tr") {
        return tr ?? TR_TX_FALLBACK[en] ?? en;
      }
      if (language === "ru") {
        return ru ?? RU_TX_FALLBACK[en] ?? en;
      }
      if (language === "az") {
        return az ?? AZ_TX_FALLBACK[en] ?? en;
      }
      return en;
    },
    [language],
  );

  const tt = useCallback(
    (en: string) => {
      if (language === "tr") {
        return TR_TX_FALLBACK[en] ?? en;
      }
      if (language === "ru") {
        return RU_TX_FALLBACK[en] ?? en;
      }
      if (language === "az") {
        return AZ_TX_FALLBACK[en] ?? en;
      }
      return en;
    },
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      tx,
      tt,
    }),
    [language, t, tx, tt],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("Missing LanguageProvider");
  }

  return context;
}
