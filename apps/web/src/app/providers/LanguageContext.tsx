import React, { useState, useEffect, ReactNode } from "react";
import { LanguageContext, type Language, type AppLocale } from "./language-context";
import { translations } from "../i18n/translations";

export type { Language } from "./language-context";

const localeByLanguage: Record<Language, AppLocale> = {
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return saved === "en" || saved === "pt" || saved === "es" ? saved : "en";
  });
  const locale = localeByLanguage[language];

  useEffect(() => {
    localStorage.setItem("app-language", language);
    document.documentElement.lang = locale;
  }, [language, locale]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] ?? translations.en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, locale, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
