"use client";

import { useState } from "react";
import { Smartphone, MapPin, Users, Pencil, Trash2, History } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { InventoryItem } from "@/lib/inventory";
import type { DirectoryPerson } from "@/lib/directory";
import { AccessorySummary } from "./AccessorySummary";

const statuses: Record<string, { th: string; en: string; color: string }> = {
  registered: { th: "รับเข้าสต็อกแล้ว", en: "Registered", color: "bg-slate-100 text-slate-700" },
  in_site_stock: { th: "พร้อมจ่ายที่ไซต์", en: "In site stock", color: "bg-emerald-50 text-emerald-800" },
  assigned: { th: "จ่ายแล้ว", en: "Assigned", color: "bg-blue-50 text-blue-800" },
  in_transit: { th: "รอไซต์รับเครื่อง", en: "Awaiting receipt", color: "bg-amber-50 text-amber-800" },
  damaged: { th: "เสียหาย", en: "Damaged", color: "bg-red-50 text-red-700" },
  under_inspection: { th: "รอตรวจสภาพ", en: "Under inspection", color: "bg-orange-50 text-orange-800" },
};

export function InventoryList({ devices, people, siteName, canWrite, pending, onEdit, onDelete, onHistory }: {
  devices: InventoryItem[]; people: DirectoryPerson[]; siteName: (id: string | null) => string;
  canWrite: boolean; pending: boolean; onEdit: (device: InventoryItem) => void; onDelete: (device: InventoryItem) => void; onHistory: (device: InventoryItem) => void;
}) {
  const { t } = useLanguage();
  const [sort, setSort] = useState("device");
  const sorted = [...devices].sort((a, b) => sort === "updated" ? (Date.parse(b.updatedAt || b.assignment?.at || "") || 0) - (Date.parse(a.updatedAt || a.assignment?.at || "") || 0) : (sort === "model" ? a.model || a.deviceName : a.deviceId).localeCompare(sort === "model" ? b.model || b.deviceName : b.deviceId));
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{t("ดูไซต์ ผู้ถือ และสถานะแต่ละเครื่อง กดรายละเอียดเพื่อดูข้อมูลเพิ่มเติม", "Scan location, holder and status. Expand a phone for technical details.")}</p><label className="text-xs text-slate-500">{t("เรียงตาม", "Sort by")}<select aria-label={t("เรียงโทรศัพท์", "Sort devices")} value={sort} onChange={(event) => setSort(event.target.value)} className="ml-2 min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value="device">Device ID</option><option value="model">{t("รุ่น", "Model")}</option><option value="updated">{t("อัปเดตล่าสุด", "Recently updated")}</option></select></label></div>
    <div className="grid gap-4 lg:grid-cols-2">{sorted.map((item) => {
      const holder = people.find((person) => person.id === item.holderId);
      const status = statuses[item.status];
      return <article key={item.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-device-id={item.id}>
        <div className="flex items-start gap-3 border-b border-slate-100 p-5"><span className="rounded-xl bg-blue-50 p-2.5"><Smartphone size={30} /></span><div className="min-w-0 flex-1"><p className="break-words text-base font-semibold text-slate-900">{item.model || item.deviceName || t("ยังไม่ระบุรุ่น", "Model not specified")}</p><h2 className="mt-1 break-all font-mono text-xs font-medium text-blue-700">{item.deviceId}</h2></div><span className={`max-w-32 shrink-0 rounded-full px-2.5 py-1 text-center text-xs font-medium ${status?.color || "bg-slate-100 text-slate-600"}`}>{status ? t(status.th, status.en) : item.status}</span></div>
        <dl className="grid grid-cols-2 gap-4 p-5"><div className="min-w-0 rounded-xl bg-slate-50 p-3"><dt className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={15} />{t("ตำแหน่งเครื่อง", "Location")}</dt><dd className="mt-2 break-words text-sm font-medium leading-6">{siteName(item.siteId)}</dd></div><div className="min-w-0 rounded-xl bg-slate-50 p-3"><dt className="flex items-center gap-1.5 text-xs text-slate-500"><Users size={15} />{t("ผู้ถือปัจจุบัน", "Current holder")}</dt><dd className="mt-2 break-words text-sm font-medium leading-6">{holder?.name || (item.holderId ? t("ไม่พบชื่อผู้ถือ", "Holder record unavailable") : t("ไม่มีผู้ถือเครื่อง", "Unassigned"))}</dd>{holder?.employeeNo && <dd className="mt-1 font-mono text-xs text-slate-500">{holder.employeeNo}</dd>}</div><div><dt className="text-xs text-slate-500">{t("เบอร์โทรศัพท์", "Phone number")}</dt><dd className="mt-2 text-sm font-medium">{item.phoneNumber || "—"}</dd></div><div><dt className="text-xs text-slate-500">{t("อัปเดตล่าสุด", "Last update")}</dt><dd className="mt-2 text-xs leading-5 text-slate-600">{item.updatedAt || item.assignment?.at ? new Date(item.updatedAt || item.assignment!.at).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : t("ยังไม่มีเวลาอัปเดต", "No update recorded")}</dd></div></dl>
        <details className="mx-5 mb-4 rounded-xl border border-slate-100"><summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium text-slate-600">{t("รายละเอียดเครื่องและอุปกรณ์", "Technical details & accessories")}</summary><div className="space-y-4 border-t border-slate-100 p-4"><dl className="grid grid-cols-2 gap-4 text-xs">{[["Device name", item.deviceName], ["IMEI", item.imei], ["Serial", item.serial], ["Managed by", item.mdm.managedBy], ["Compliance", item.mdm.complianceState], ["Last check-in", item.mdm.lastCheckInAt]].map(([label, value]) => <div key={label}><dt className="text-slate-400">{label}</dt><dd className="mt-1 break-all leading-5 text-slate-700">{value || "—"}</dd></div>)}</dl>{item.status === "assigned" && <AccessorySummary issued={item.assignment?.accessories} />}</div></details>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 bg-slate-50/50 px-5 py-2"><button type="button" disabled={pending} onClick={() => onHistory(item)} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700"><History size={17} />{t("ดูประวัติ", "View history")}</button>{canWrite && <><button type="button" disabled={pending} onClick={() => onEdit(item)} className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600"><Pencil size={16} />{t("แก้ไข", "Edit")}</button>{item.status === "registered" && !item.siteId && !item.holderId && <button type="button" disabled={pending} onClick={() => onDelete(item)} className="inline-flex min-h-11 items-center gap-2 text-sm text-red-700"><Trash2 size={16} />{t("ลบรายการที่ยังไม่ใช้งาน", "Delete unused registration")}</button>}</>}</div>
      </article>;
    })}</div>
  </div>;
}
