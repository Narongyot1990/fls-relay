"use client";

import { useSyncExternalStore } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";

export type ListView = "card" | "table";
const fallback = new Map<string, ListView>();
const eventName = "fls-list-view-change";
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(eventName, listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener(eventName, listener); };
}

/** Presentation preferences only; selection and filters stay in the owning list. */
export function useListView(scope: string) {
  const key = `fls:list-view:${scope}`;
  const view = useSyncExternalStore(subscribe, () => {
    try { const stored = window.localStorage.getItem(key); return stored === "table" || stored === "card" ? stored : fallback.get(key) || "card"; }
    catch { return fallback.get(key) || "card"; }
  }, () => "card" as ListView);
  function setView(value: ListView) {
    fallback.set(key, value);
    try { window.localStorage.setItem(key, value); } catch { /* Private browsing may disable storage. */ }
    window.dispatchEvent(new Event(eventName));
  }
  return [view, setView] as const;
}

export function ListViewToggle({ view, onChange, disabled = false, compact = false }: { view: ListView; onChange: (view: ListView) => void; disabled?: boolean; compact?: boolean }) {
  const { t } = useLanguage();
  return <div role="group" aria-label={t("มุมมองรายการ", "List view")} className={`inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-100 ${compact ? "p-0.5" : "p-1"}`}>
    {(["card", "table"] as const).map((value) => <button key={value} type="button" title={value === "card" ? t("การ์ด", "Card") : t("ตาราง", "Table")} disabled={disabled} aria-pressed={view === value} onClick={() => onChange(value)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 ${compact ? "w-11" : "px-3"} ${view === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white/60"}`}>
      <span aria-hidden="true" className={`grid h-4 w-4 gap-0.5 ${value === "card" ? "grid-cols-2" : "grid-cols-1"}`}>{Array.from({ length: value === "card" ? 4 : 3 }, (_, i) => <span key={i} className="rounded-[1px] border border-current" />)}</span>
      <span className={compact ? "sr-only" : ""}>{value === "card" ? t("การ์ด", "Card") : t("ตาราง", "Table")}</span>
    </button>)}
  </div>;
}
