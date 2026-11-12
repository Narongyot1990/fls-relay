"use client";

import type { ReactNode } from "react";
import { History, ArrowRight } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { SiteSummary } from "@/lib/site-tracking";
import { ListPageHeading } from "./ListPageHeading";
import { useListView } from "./ListViewToggle";
import { ResponsiveRecordTable } from "./ResponsiveRecordTable";

export function SiteTrackingPanel({ summaries, selectedSite, locked, pending, scope, onBack, onPhones, onHistory, onRefresh }: {
  summaries: SiteSummary[]; selectedSite: string; locked: boolean; pending: boolean; scope: ReactNode; onBack: () => void;
  onPhones: (site: string, status: string) => void; onHistory: (site: string) => void; onRefresh: () => void;
}) {
  const { t } = useLanguage();
  const [view, setView] = useListView("site-tracking");
  const visible = summaries.filter((row) => locked || selectedSite === "all" || (row.siteId || "central") === selectedSite).map((row) => ({ ...row, id: row.siteId || "central" }));
  const name = (row: SiteSummary) => row.siteId === null ? t("สต็อกส่วนกลาง", "Central stock") : row.name || t("ไม่พบชื่อไซต์", "Site name unavailable");
  const totals = [{ label: t("ทั้งหมด", "Total"), value: visible.reduce((n, row) => n + row.total, 0) }, { label: t("จ่ายแล้ว", "Assigned"), value: visible.reduce((n, row) => n + row.assigned, 0) }, { label: t("สต็อก", "Stock"), value: visible.reduce((n, row) => n + row.inStock, 0) }];
  const metric = (row: SiteSummary, status: string, label: string, count: number, compact = false) => <button type="button" disabled={pending} onClick={() => onPhones(row.siteId || "central", status)} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"><span className={compact ? "sr-only" : ""}>{label}</span><strong className="text-base tabular-nums">{count}</strong></button>;
  const coverage = (row: SiteSummary, compact = false) => row.siteId === null ? <span className="text-xs text-slate-500">{t("ยังไม่จัดสรรไซต์", "Not allocated to a site")}</span> : <div className="space-y-1.5">
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs"><span className={compact ? "sr-only" : "text-slate-500"}>{t("คนขับที่ถือเครื่อง / คนขับในไซต์", "Drivers with phones / site drivers")}</span><strong className="text-emerald-700">{row.driversWithPhone} / {row.driverCount}</strong></div>
    <div role="progressbar" aria-label={t("สัดส่วนคนขับที่ได้รับเครื่อง", "Driver phone coverage")} aria-valuenow={row.driverCount ? Math.round(row.driversWithPhone / row.driverCount * 100) : 0} aria-valuemin={0} aria-valuemax={100} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div style={{ width: `${row.driverCount ? row.driversWithPhone / row.driverCount * 100 : 0}%` }} className="h-full rounded-full bg-emerald-500" /></div>
    <p className={`text-xs ${row.driverCount > row.driversWithPhone ? "text-amber-800" : "text-slate-500"}`}>{t("ยังไม่ได้รับเครื่อง", "Without a phone")}: {row.driverCount - row.driversWithPhone}</p>
  </div>;
  const actions = (row: SiteSummary) => <div className="flex flex-wrap items-center gap-x-4"><button type="button" disabled={pending} onClick={() => onPhones(row.siteId || "central", "all")} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-blue-700">{t("ดูเครื่องในไซต์", "View phones")}<ArrowRight size={14} /></button><button type="button" disabled={pending} onClick={() => onHistory(row.siteId || "central")} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-slate-600"><History size={15} />{t("ประวัติไซต์", "Site history")}</button></div>;
  const details = (row: SiteSummary) => <div className="space-y-3"><div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-50">{metric(row, "all", t("ทั้งหมด", "Total"), row.total)}{metric(row, "assigned", t("จ่ายแล้ว", "Assigned"), row.assigned)}{metric(row, "stock", t("สต็อก", "Stock"), row.inStock)}</div>{coverage(row)}{(row.pending > 0 || row.unavailable > 0) && <p className="text-xs text-amber-800">{t("รอรับเครื่อง", "Awaiting receipt")}: {row.pending} · {t("ยังไม่พร้อมจ่าย", "Unavailable")}: {row.unavailable}</p>}{actions(row)}</div>;
  return <div className="min-w-0 space-y-3">
    <div data-testid="site-tracking-toolbar" className="space-y-2 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-4 lg:space-y-0">
      <ListPageHeading title={t("ติดตามรายไซต์", "Site tracking")} onBack={onBack} view={view} onView={setView} disabled={pending} action={{ label: t("อัปเดตยอด", "Refresh counts"), icon: <span aria-hidden="true" className="text-xl">↻</span>, onClick: onRefresh }} />
      <div className="flex min-w-0 items-center gap-2"><div className="min-w-0 flex-1">{scope}</div><dl className="grid shrink-0 grid-cols-3 gap-2">{totals.map((item) => <div key={item.label} className="min-w-11 text-center"><dt className="text-[10px] text-slate-500">{item.label}</dt><dd className="text-base font-semibold tabular-nums text-slate-800">{item.value}</dd></div>)}</dl></div>
    </div>
    {view === "table" ? <ResponsiveRecordTable label={t("ติดตามรายไซต์", "Site tracking")} rows={visible} name={name} rowAttribute="data-site-tracking-id" columns={[
      { key: "site", label: t("ไซต์", "Site"), className: "w-[48%] md:w-[25%]", render: (row) => <div><h2 className="font-semibold">{name(row)}</h2>{row.code && <p className="mt-1 font-mono text-xs text-slate-500">{row.code}</p>}{!row.active && <p className="mt-1 text-xs text-slate-500">{t("ปิดใช้งาน", "Inactive")}</p>}<div className="mt-2 space-y-1 text-xs text-slate-500 md:hidden"><p>{t("ทั้งหมด", "Total")}: {row.total} · {t("สต็อก", "Stock")}: {row.inStock}</p>{row.siteId !== null && <p>{t("คนขับ", "Drivers")}: {row.driversWithPhone} / {row.driverCount}</p>}</div></div> },
      { key: "total", label: t("ทั้งหมด", "Total"), secondary: true, render: (row) => metric(row, "all", t("ทั้งหมด", "Total"), row.total, true) },
      { key: "assigned", label: t("จ่ายแล้ว", "Assigned"), render: (row) => metric(row, "assigned", t("จ่ายแล้ว", "Assigned"), row.assigned, true) },
      { key: "stock", label: t("สต็อก", "Stock"), secondary: true, render: (row) => metric(row, "stock", t("สต็อก", "Stock"), row.inStock, true) },
      { key: "drivers", label: t("คนขับ", "Drivers"), secondary: true, render: (row) => coverage(row, true) },
    ]} details={details} /> : <div className="grid items-start gap-3 lg:grid-cols-2">{visible.map((row) => <article key={row.id} data-site-tracking-id={row.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2"><div className="min-w-0"><h2 className="break-words text-sm font-semibold">{name(row)}</h2>{row.code && <p className="mt-0.5 font-mono text-xs text-slate-500">{row.code}</p>}</div>{!row.active && <span className="text-xs text-slate-500">{t("ปิดใช้งาน", "Inactive")}</span>}</header><div className="p-3 pb-0">{details(row)}</div></article>)}</div>}
    {!visible.length && <p className="rounded-xl border bg-white p-5 text-sm text-slate-500">{t("ไม่มีข้อมูลไซต์ในขอบเขตนี้", "No site summaries in this scope.")}</p>}
  </div>;
}
