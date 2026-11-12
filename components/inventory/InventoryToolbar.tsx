"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Plus, Search } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { ListViewToggle, type ListView } from "./ListViewToggle";

export function InventoryToolbar({ scope, total, matched, stock, assigned, status, onStatus, query, onQuery, sort, onSort, view, onView, onBack, onAdd, pending }: {
  scope: ReactNode; total: number; matched: number; stock: number; assigned: number;
  status: string; onStatus: (value: string) => void; query: string; onQuery: (value: string) => void;
  sort: string; onSort: (value: string) => void; view: ListView; onView: (value: ListView) => void;
  onBack: () => void; onAdd?: () => void; pending: boolean;
}) {
  const { t } = useLanguage();
  const field = "h-11 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 disabled:opacity-50";
  return <div data-testid="inventory-toolbar" className="space-y-2 lg:grid lg:grid-cols-[auto_minmax(0,1fr)_280px] lg:items-center lg:gap-3 lg:space-y-0">
    <div data-toolbar-row className="flex min-w-0 items-center gap-2">
      <button type="button" disabled={pending} onClick={onBack} aria-label={t("กลับเมนูหลัก", "Back to menu")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ArrowLeft size={18} /></button>
      <div className="min-w-0 flex-1"><h1 aria-label={t("รายการเครื่องในระบบ")} className="truncate text-base font-semibold">{t("โทรศัพท์", "Devices")}</h1><p role="status" aria-label={t(`แสดง ${matched} จาก ${total} เครื่อง`, `Showing ${matched} of ${total} devices`)} className={matched === total ? "sr-only" : "text-xs tabular-nums text-slate-500"}>{matched} / {total}</p></div>
      {onAdd && <button type="button" disabled={pending} onClick={onAdd} aria-label={t("เพิ่มเครื่อง", "Add")} title={t("เพิ่มเครื่อง", "Add")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-50"><Plus size={20} /></button>}
      <ListViewToggle view={view} onChange={onView} compact disabled={pending} />
    </div>
    <div data-toolbar-row className="flex min-w-0 gap-2">
      <label className="relative min-w-0 flex-1"><span className="sr-only">{t("ค้นหาเครื่อง")}</span><Search size={17} className="absolute top-3.5 left-3" /><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder={t("ค้นหาเครื่อง คนขับ เบอร์โทร หรือไซต์", "Search phone, driver, number or site")} className={`${field} w-full pr-2 pl-10`} /></label>
      <select aria-label={t("เรียงโทรศัพท์", "Sort devices")} value={sort} onChange={(event) => onSort(event.target.value)} className={`${field} w-28 shrink-0`}><option value="device">Device ID</option><option value="model">{t("รุ่น", "Model")}</option><option value="updated">{t("อัปเดตล่าสุด", "Recently updated")}</option></select>
    </div>
    <div data-toolbar-row className="grid min-w-0 grid-cols-2 gap-2">
      {scope}
      <select aria-label={t("กรองสถานะโทรศัพท์", "Filter device status")} value={status} onChange={(event) => onStatus(event.target.value)} className={field}>
        <option value="all">{t("ทั้งหมด", "Total")} · {total}</option><option value="stock">{t("อยู่ในสต็อก", "In stock")} · {stock}</option><option value="assigned">{t("จ่ายแล้ว", "Assigned")} · {assigned}</option>
        <option value="registered">{t("รับเข้าสต็อกแล้ว", "Registered")}</option><option value="in_site_stock">{t("พร้อมจ่ายที่ไซต์", "In site stock")}</option><option value="in_transit">{t("รอไซต์รับเครื่อง", "Awaiting receipt")}</option><option value="damaged">{t("เสียหาย", "Damaged")}</option><option value="under_inspection">{t("รอตรวจสภาพ", "Under inspection")}</option>
      </select>
    </div>
  </div>;
}
