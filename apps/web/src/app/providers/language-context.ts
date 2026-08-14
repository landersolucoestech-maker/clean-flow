import { createContext } from "react";

export type Language = "en" | "pt" | "es";
export type AppLocale = "en-US" | "pt-BR" | "es-ES";

export interface LanguageContextType {
  language: Language;
  locale: AppLocale;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
