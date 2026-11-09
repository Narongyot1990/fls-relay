"use client";

import { useState } from "react";
import { Check, Info, Search, Smartphone, Users } from "@/components/shared/BrandIcon";
import { AccessorySummary } from "./AccessorySummary";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { InventoryItem } from "@/lib/inventory";
import type { HandoverPerson } from "./HandoverReview";

export function DriverPicker({ holders, devices, value, onChange, assignedOnly = false, disabled = false }: {
  holders: HandoverPerson[]; devices: InventoryItem[]; value: string; onChange: (id: string) => void;
  assignedOnly?: boolean; disabled?: boolean;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<HandoverPerson | null>(null);
  const assignments = (id: string) => devices.filter((device) => device.status === "assigned" && device.holderId === id);
  const drivers = holders.filter((person) => person.type === "driver" && (assignedOnly ? assignments(person.id).length > 0 : person.active));
  const matches = drivers.filter((person) => `${person.name} ${person.employeeNo}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (filter === "all" || (filter === "assigned") === (assignments(person.id).length > 0)));
  return <div className="space-y-3">
    <label className="relative block"><span className="sr-only">{t("ค้นหาคนขับ", "Search drivers")}</span><Search size={18} className="absolute top-3.5 left-3 text-slate-400" /><input disabled={disabled} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("ค้นหาชื่อหรือรหัสพนักงาน FLS", "Search name or FLS Employee ID")} className="min-h-12 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-10 text-base" /></label>
    {!assignedOnly && <div role="group" aria-label={t("สถานะการรับเครื่อง", "Assignment status")} className="flex flex-wrap gap-2">{(["all", "assigned", "unassigned"] as const).map((id) => <button key={id} type="button" disabled={disabled} aria-pressed={filter === id} onClick={() => setFilter(id)} className={`min-h-11 rounded-lg border px-3 text-sm ${filter === id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white"}`}>{id === "all" ? t("ทั้งหมด", "All drivers") : id === "assigned" ? t("ได้รับเครื่องแล้ว", "Has phone") : t("ยังไม่ได้รับเครื่อง", "No phone")}</button>)}</div>}
    <div className="space-y-2">{matches.map((person) => { const assigned = assignments(person.id); return <div key={person.id} className={`flex items-center gap-2 rounded-xl border bg-white p-2 ${value === person.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
      <button type="button" disabled={disabled} aria-pressed={value === person.id} onClick={() => onChange(person.id)} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 p-2 text-left"><Users size={20} className="shrink-0 text-slate-400" /><span className="min-w-0 flex-1"><strong className="block break-words">{person.name}</strong><span className="block text-xs text-slate-500">{person.employeeNo}</span><span className={`mt-1 inline-flex items-center gap-1 text-xs ${assigned.length ? "text-emerald-700" : "text-slate-500"}`}>{assigned.length ? <Check size={14} /> : <Smartphone size={14} />}{assigned.length ? t(`ได้รับเครื่องแล้ว (${assigned.length})`, `Has phone (${assigned.length})`) : t("ยังไม่ได้รับเครื่อง", "No phone")}</span></span></button>
      <button type="button" disabled={disabled} aria-label={t(`รายละเอียดเครื่องของ ${person.name}`, `Phone details for ${person.name}`)} onClick={() => setDetail(person)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50"><Info size={20} /></button>
    </div>; })}</div>
    {!matches.length && <p role="status" className="rounded-lg bg-slate-50 p-5 text-sm text-slate-500">{assignedOnly ? t("ไม่มีคนขับที่ถือเครื่องตรงกับการค้นหาในขอบเขตนี้", "No drivers with assigned phones match in this scope.") : t("ไม่พบคนขับที่ตรงกับตัวกรอง", "No drivers match these filters.")}</p>}
    {detail && <Dialog open onOpenChange={(open) => { if (!open) setDetail(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto bg-white"><DialogTitle>{detail.name}</DialogTitle><DialogDescription>{detail.employeeNo} · {t("เครื่องที่ถืออยู่ในขอบเขตนี้", "Assigned phones in this scope")}</DialogDescription>{assignments(detail.id).map((device) => <dl key={device.id} className="space-y-2 rounded-lg border p-4 text-sm"><div><dt>{t("รุ่น", "Model")}</dt><dd className="font-semibold">{device.model || device.deviceName || "—"}</dd></div>{[["Device ID", device.deviceId], [t("ผู้ผลิต", "Manufacturer"), device.manufacturer || ""], [t("เบอร์โทร", "Phone number"), device.phoneNumber], ["IMEI", device.imei], ["Serial", device.serial]].map(([label, text]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="break-all">{text || "—"}</dd></div>)}<div><dt className="sr-only">{t("อุปกรณ์", "Accessories")}</dt><dd className="mt-3"><AccessorySummary issued={device.assignment?.accessories} /></dd></div></dl>)}{!assignments(detail.id).length && <p>{t("ยังไม่ได้รับเครื่อง", "No phone")}</p>}</DialogContent></Dialog>}
  </div>;
}
