"use client";

import { MapPin } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { countForStatus, type SiteSummary } from "@/lib/site-tracking";

export function SiteInventoryFilters({ summaries, selectedSite, status, locked, disabled, onSelect }: {
  summaries: SiteSummary[]; selectedSite: string; status: string; locked: boolean; disabled: boolean; onSelect: (site: string) => void;
}) {
  const { t } = useLanguage();
  if (!summaries.length) return null;
  const options = [
    ...(!locked ? [{ id: "all", name: t("ทุกไซต์", "All sites"), code: "", count: summaries.reduce((total, row) => total + countForStatus(row, status), 0) }] : []),
    ...summaries.map((row) => ({ id: row.siteId || "central", name: row.siteId === null ? t("สต็อกส่วนกลาง", "Central stock") : row.name || t("ไม่พบชื่อไซต์", "Site name unavailable"), code: row.code, count: countForStatus(row, status) })),
  ];
  return <section aria-label={t("เลือกไซต์ที่ต้องการติดตาม", "Track by site")} className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5"><div className="flex items-start gap-2"><MapPin size={19} /><div><h2 className="text-sm font-semibold text-slate-800">{status === "assigned" ? t("Assigned แยกตามไซต์", "Assigned by site") : t("โทรศัพท์แยกตามไซต์", "Phones by site")}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{locked ? t("แสดงเฉพาะไซต์สังกัดของคุณ", "Showing your assigned site only.") : t("กดชื่อไซต์เพื่อกรองรายการด้านล่าง ตัวเลขแสดงยอดตามสถานะที่เลือก", "Choose a site to filter the list below. Counts follow the selected status.")}</p></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{options.map((option) => <button key={option.id} type="button" disabled={disabled || locked} aria-pressed={(locked ? summaries[0]?.siteId : selectedSite) === option.id} onClick={() => onSelect(option.id)} className={`flex min-h-20 min-w-0 items-center justify-between gap-2 rounded-xl border p-3 text-left disabled:cursor-default ${((locked ? summaries[0]?.siteId : selectedSite) === option.id) ? "border-blue-500 bg-white ring-1 ring-blue-500" : "border-slate-200 bg-white/80 hover:border-blue-300"}`}><span className="min-w-0"><strong className="block break-words text-xs font-semibold text-slate-700">{option.name}</strong>{option.code && <span className="mt-1 block break-all font-mono text-[10px] text-slate-400">{option.code}</span>}</span><span className="shrink-0 text-xl font-bold tabular-nums text-blue-700">{option.count}</span></button>)}</div></section>;
}
