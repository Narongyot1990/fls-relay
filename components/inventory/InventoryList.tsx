"use client";

import { Smartphone, MapPin, Users, Pencil, Trash2, History } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { InventoryItem } from "@/lib/inventory";
import type { DirectoryPerson } from "@/lib/directory";
import { AccessorySummary } from "./AccessorySummary";
import type { ListView } from "./ListViewToggle";
import { ResponsiveRecordTable } from "./ResponsiveRecordTable";

const statuses: Record<string, { th: string; en: string; color: string }> = {
  registered: { th: "รับเข้าสต็อกแล้ว", en: "Registered", color: "bg-slate-100 text-slate-700" },
  in_site_stock: { th: "พร้อมจ่ายที่ไซต์", en: "In site stock", color: "bg-emerald-50 text-emerald-800" },
  assigned: { th: "จ่ายแล้ว", en: "Assigned", color: "bg-blue-50 text-blue-800" },
  in_transit: { th: "รอไซต์รับเครื่อง", en: "Awaiting receipt", color: "bg-amber-50 text-amber-800" },
  damaged: { th: "เสียหาย", en: "Damaged", color: "bg-red-50 text-red-700" },
  under_inspection: { th: "รอตรวจสภาพ", en: "Under inspection", color: "bg-orange-50 text-orange-800" },
};

export function InventoryList({ devices, people, siteName, canWrite, pending, onEdit, onDelete, onHistory, groupBySite = false, view, sort }: {
  view: ListView; sort: string; devices: InventoryItem[]; people: DirectoryPerson[]; siteName: (id: string | null) => string;
  groupBySite?: boolean; canWrite: boolean; pending: boolean; onEdit: (device: InventoryItem) => void; onDelete: (device: InventoryItem) => void; onHistory: (device: InventoryItem) => void;
}) {
  const { t } = useLanguage();
  const model = (item: InventoryItem) => [item.manufacturer, item.model || item.deviceName].filter(Boolean).join(" ") || t("ยังไม่ระบุรุ่น", "Model not specified");
  const holderName = (item: InventoryItem) => people.find((person) => person.id === item.holderId)?.name || (item.holderId ? t("ไม่พบชื่อผู้ถือ", "Holder record unavailable") : t("ไม่มีผู้ถือเครื่อง", "Unassigned"));
  const statusBadge = (item: InventoryItem) => <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statuses[item.status]?.color || "bg-slate-100 text-slate-600"}`}>{statuses[item.status] ? t(statuses[item.status].th, statuses[item.status].en) : item.status}</span>;
  const actions = (item: InventoryItem) => <div className="flex flex-wrap gap-x-5 gap-y-1"><button type="button" disabled={pending} onClick={() => onHistory(item)} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700"><History size={17} />{t("ดูประวัติ", "View history")}</button>{canWrite && <><button type="button" disabled={pending} onClick={() => onEdit(item)} className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-600"><Pencil size={16} />{t("แก้ไข", "Edit")}</button>{item.status === "registered" && !item.siteId && !item.holderId && <button type="button" disabled={pending} onClick={() => onDelete(item)} className="inline-flex min-h-11 items-center gap-2 text-sm text-red-700"><Trash2 size={16} />{t("ลบรายการที่ยังไม่ใช้งาน", "Delete unused registration")}</button>}</>}</div>;
  const tableDetails = (item: InventoryItem) => <div className="space-y-4"><dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">{[[t("รุ่น", "Model"), model(item)], ["Device ID", item.deviceId], [t("ตำแหน่งเครื่อง", "Location"), siteName(item.siteId)], [t("ผู้ถือปัจจุบัน", "Current holder"), holderName(item)], ["FLS Employee ID", people.find((person) => person.id === item.holderId)?.employeeNo], [t("เบอร์โทรศัพท์", "Phone number"), item.phoneNumber], ["Device name", item.deviceName], ["IMEI", item.imei], ["Serial", item.serial], ["Managed by", item.mdm.managedBy], ["Compliance", item.mdm.complianceState], ["Last check-in", item.mdm.lastCheckInAt], [t("อัปเดตล่าสุด", "Last update"), item.updatedAt || item.assignment?.at ? new Date(item.updatedAt || item.assignment!.at).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" }) : "—"]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium">{value || "—"}</dd></div>)}</dl>{item.status === "assigned" && <AccessorySummary issued={item.assignment?.accessories} />}{actions(item)}</div>;
  const sorted = [...devices].sort((a, b) => sort === "updated" ? (Date.parse(b.updatedAt || b.assignment?.at || "") || 0) - (Date.parse(a.updatedAt || a.assignment?.at || "") || 0) : (sort === "model" ? a.model || a.deviceName : a.deviceId).localeCompare(sort === "model" ? b.model || b.deviceName : b.deviceId));
  const groups = groupBySite ? [...new Set(sorted.map((item) => item.siteId))].sort((a, b) => a === null ? 1 : b === null ? -1 : siteName(a).localeCompare(siteName(b))).map((id) => ({ id: id || "central", siteId: id, devices: sorted.filter((item) => item.siteId === id) })) : [{ id: "all", siteId: null, devices: sorted }];
  return <div className="min-w-0 space-y-3">
    {groups.map((group) => <section key={group.id} className="space-y-3" data-assigned-site-group={groupBySite ? group.id : undefined}>{groupBySite && <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-semibold text-blue-900"><MapPin size={20} />{siteName(group.siteId)}</h2><span className="text-xs font-medium text-blue-700">{group.devices.length} {t("เครื่องที่จ่ายแล้ว", "assigned phone(s)")}</span></div>}
    {view === "table" ? <ResponsiveRecordTable label={groupBySite ? siteName(group.siteId) : t("รายการโทรศัพท์", "Phone inventory")} rows={group.devices} name={(item) => item.deviceId} details={tableDetails} rowAttribute="data-device-id" columns={[
      { key: "phone", label: t("โทรศัพท์", "Phone"), className: "w-[48%] md:w-[25%]", render: (item) => <div><p className="font-semibold text-slate-900">{model(item)}</p><p className="mt-1 font-mono text-xs text-blue-700">{item.deviceId}</p><div className="mt-2 space-y-1 text-xs text-slate-500 md:hidden"><p>{siteName(item.siteId)}</p><p>{holderName(item)}</p></div></div> },
      { key: "status", label: t("สถานะ", "Status"), className: "w-[30%] md:w-[16%]", render: statusBadge },
      { key: "site", label: t("ไซต์", "Site"), secondary: true, render: (item) => siteName(item.siteId) },
      { key: "holder", label: t("ผู้ถือปัจจุบัน", "Current holder"), secondary: true, render: (item) => <div><p>{holderName(item)}</p><p className="mt-1 text-xs text-slate-500">{people.find((person) => person.id === item.holderId)?.employeeNo}</p></div> },
      { key: "phoneNumber", label: t("เบอร์โทรศัพท์", "Phone number"), secondary: true, render: (item) => item.phoneNumber || "—" },
    ]} /> : <div className="grid gap-4 lg:grid-cols-2">{group.devices.map((item) => {
      const holder = people.find((person) => person.id === item.holderId);
      const status = statuses[item.status];
      return <article key={item.id} className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-device-id={item.id}>
        <div className="flex items-start gap-3 border-b border-slate-100 p-5"><span className="rounded-xl bg-blue-50 p-2.5"><Smartphone size={30} /></span><div className="min-w-0 flex-1"><p className="break-words text-base font-semibold text-slate-900">{[item.manufacturer, item.model || item.deviceName].filter(Boolean).join(" ") || t("ยังไม่ระบุรุ่น", "Model not specified")}</p><h2 className="mt-1 break-all font-mono text-xs font-medium text-blue-700">{item.deviceId}</h2></div><span className={`max-w-32 shrink-0 rounded-full px-2.5 py-1 text-center text-xs font-medium ${status?.color || "bg-slate-100 text-slate-600"}`}>{status ? t(status.th, status.en) : item.status}</span></div>
        <dl className="grid grid-cols-2 gap-4 p-5"><div className="min-w-0 rounded-xl bg-slate-50 p-3"><dt className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin size={15} />{t("ตำแหน่งเครื่อง", "Location")}</dt><dd className="mt-2 break-words text-sm font-medium leading-6">{siteName(item.siteId)}</dd></div><div className="min-w-0 rounded-xl bg-slate-50 p-3"><dt className="flex items-center gap-1.5 text-xs text-slate-500"><Users size={15} />{t("ผู้ถือปัจจุบัน", "Current holder")}</dt><dd className="mt-2 break-words text-sm font-medium leading-6">{holder?.name || (item.holderId ? t("ไม่พบชื่อผู้ถือ", "Holder record unavailable") : t("ไม่มีผู้ถือเครื่อง", "Unassigned"))}</dd>{holder?.employeeNo && <dd className="mt-1 font-mono text-xs text-slate-500">{holder.employeeNo}</dd>}</div><div><dt className="text-xs text-slate-500">{t("เบอร์โทรศัพท์", "Phone number")}</dt><dd className="mt-2 text-sm font-medium">{item.phoneNumber || "—"}</dd></div><div><dt className="text-xs text-slate-500">{t("อัปเดตล่าสุด", "Last update")}</dt><dd className="mt-2 text-xs leading-5 text-slate-600">{item.updatedAt || item.assignment?.at ? new Date(item.updatedAt || item.assignment!.at).toLocaleString("en-GB", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : t("ยังไม่มีเวลาอัปเดต", "No update recorded")}</dd></div></dl>
        <details className="mx-5 mb-4 rounded-xl border border-slate-100"><summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium text-slate-600">{t("รายละเอียดเครื่องและอุปกรณ์", "Technical details & accessories")}</summary><div className="space-y-4 border-t border-slate-100 p-4"><dl className="grid grid-cols-2 gap-4 text-xs">{[["Device name", item.deviceName], [t("ผู้ผลิต", "Manufacturer"), item.manufacturer], ["IMEI", item.imei], ["Serial", item.serial], ["Managed by", item.mdm.managedBy], ["Compliance", item.mdm.complianceState], ["Last check-in", item.mdm.lastCheckInAt]].map(([label, value]) => <div key={label}><dt className="text-slate-400">{label}</dt><dd className="mt-1 break-all leading-5 text-slate-700">{value || "—"}</dd></div>)}</dl>{item.status === "assigned" && <AccessorySummary issued={item.assignment?.accessories} />}</div></details>
        <div className="mt-auto border-t border-slate-100 bg-slate-50/50 px-5 py-2">{actions(item)}</div>
      </article>;
    })}</div>}</section>)}
  </div>;
}
