"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translateUi, type UiLanguage } from "@/lib/ui-language";

const LanguageContext = createContext<{
  language: UiLanguage;
  revision: number;
  setLanguage: (language: UiLanguage) => void;
  t: (text: string, english?: string) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ language: "en" as UiLanguage, revision: 0 });
  useEffect(() => { document.documentElement.lang = state.language; }, [state.language]);
  function setLanguage(language: UiLanguage) {
    setState((previous) => previous.language === language ? previous : { language, revision: previous.revision + 1 });
  }
  return <LanguageContext.Provider value={{ ...state, setLanguage, t: (text, english) =>
    english !== undefined ? (state.language === "th" ? text : english) : translateUi(text, state.language) }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("LanguageProvider is required");
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return <div className="flex shrink-0 rounded-lg bg-slate-100 p-1" role="group" aria-label="Interface language">
    {(["en", "th"] as const).map((value) => <button key={value} type="button" lang={value} aria-pressed={language === value} onClick={() => setLanguage(value)} className={`min-h-10 rounded-md px-3 text-xs font-semibold ${language === value ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>{value.toUpperCase()}</button>)}
  </div>;
}
