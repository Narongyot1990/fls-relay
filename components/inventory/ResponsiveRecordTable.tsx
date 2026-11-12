"use client";

import { Fragment, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";

export interface RecordColumn<T> { key: string; label: string; render: (item: T) => ReactNode; secondary?: boolean; className?: string }
const desktopQuery = "(min-width: 768px)";
function subscribeWidth(listener: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** Keep native table semantics. Secondary columns remain available in expanded row details on small screens. */
export function ResponsiveRecordTable<T extends { id: string }>({ label, rows, columns, name, details, selected, rowAttribute }: {
  label: string; rows: T[]; columns: RecordColumn<T>[]; name: (item: T) => string;
  details: (item: T) => ReactNode; selected?: (item: T) => boolean; rowAttribute?: string;
}) {
  const { t } = useLanguage();
  const prefix = useId();
  const desktop = useSyncExternalStore(subscribeWidth, () => window.matchMedia(desktopQuery).matches, () => false);
  // A colspan must match visible columns; spanning hidden columns creates phantom columns on mobile.
  const visibleColumnCount = columns.filter((col) => desktop || !col.secondary).length + 1;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  return <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
    <table className="w-full table-fixed border-collapse text-left text-sm">
      <caption className="sr-only">{label}</caption>
      <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600"><tr>
        {columns.map((col) => <th key={col.key} scope="col" className={`px-3 py-3 font-medium sm:px-4 ${col.secondary ? "hidden md:table-cell" : ""} ${col.className || ""}`}>{col.label}</th>)}
        <th scope="col" className="w-14 px-1 py-3"><span className="sr-only">{t("รายละเอียด", "Details")}</span></th>
      </tr></thead>
      <tbody>{rows.map((item) => {
        const open = expanded.has(item.id), detailId = `${prefix}-${item.id}`;
        return <Fragment key={item.id}><tr {...(rowAttribute ? { [rowAttribute]: item.id } : {})} className={`border-b border-slate-100 align-top ${selected?.(item) ? "bg-blue-50" : "hover:bg-slate-50/70"}`}>
          {columns.map((col) => <td key={col.key} className={`break-words px-3 py-3 [overflow-wrap:anywhere] sm:px-4 ${col.secondary ? "hidden md:table-cell" : ""}`}>{col.render(item)}</td>)}
          <td className="px-1 py-2"><button type="button" aria-label={t(`รายละเอียด ${name(item)}`, `Details for ${name(item)}`)} aria-expanded={open} aria-controls={detailId} onClick={() => setExpanded((prev) => { const next = new Set(prev); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-lg font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600"><span aria-hidden="true">{open ? "−" : "+"}</span></button></td>
        </tr><tr hidden={!open} id={detailId}><td colSpan={visibleColumnCount} className="border-b border-slate-200 bg-slate-50 p-4 [overflow-wrap:anywhere] sm:p-5">{open && details(item)}</td></tr></Fragment>;
      })}</tbody>
    </table>
  </div>;
}
