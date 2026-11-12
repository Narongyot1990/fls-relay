"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { ListViewToggle, type ListView } from "./ListViewToggle";

export function ListPageHeading({ title, onBack, view, onView, disabled, action, count }: {
  title: string; onBack: () => void; view: ListView; onView: (value: ListView) => void; disabled: boolean;
  action?: { label: string; icon: ReactNode; onClick: () => void; primary?: boolean }; count?: { shown: number; total: number };
}) {
  const { t } = useLanguage();
  return <div className="flex min-w-0 items-center gap-2">
    <button type="button" disabled={disabled} onClick={onBack} aria-label={t("กลับเมนูหลัก", "Back to menu")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"><ArrowLeft size={18} /></button>
    <div className="min-w-0 flex-1"><h1 title={title} className="truncate text-base font-semibold">{title}</h1>{count && count.shown !== count.total && <p role="status" className="text-xs tabular-nums text-slate-500">{count.shown} / {count.total}</p>}</div>
    {action && <button type="button" aria-label={action.label} title={action.label} disabled={disabled} onClick={action.onClick} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg disabled:opacity-50 ${action.primary ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-blue-700 hover:bg-blue-50"}`}>{action.icon}</button>}
    <ListViewToggle compact view={view} onChange={onView} disabled={disabled} />
  </div>;
}
