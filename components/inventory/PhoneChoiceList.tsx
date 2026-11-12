"use client";

import type { ReactNode } from "react";
import type { InventoryItem } from "@/lib/inventory";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { ListViewToggle, useListView } from "./ListViewToggle";
import { ResponsiveRecordTable } from "./ResponsiveRecordTable";

/** Shares the presentation switch across issue and exchange without owning assignment state. */
export function PhoneChoiceList({ devices, selectedId, onSelect, siteName, card, disabled = false }: {
  devices: InventoryItem[]; selectedId: string; onSelect: (id: string) => void;
  siteName: (id: string | null) => string; card: (item: InventoryItem) => ReactNode; disabled?: boolean;
}) {
  const { t } = useLanguage();
  const [view, setView] = useListView("phone-choices");
  return <div className="mt-3 min-w-0 space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{t(`${devices.length} เครื่องพร้อมจ่าย`, `${devices.length} available phone(s)`)}</p><ListViewToggle view={view} onChange={setView} disabled={disabled} /></div>
    {view === "card" ? <div className="grid gap-3 sm:grid-cols-2">{devices.map(card)}</div> : <ResponsiveRecordTable label={t("เลือกโทรศัพท์", "Select phone")} rows={devices} name={(item) => item.deviceId} selected={(item) => selectedId === item.id} columns={[
      { key: "phone", label: t("โทรศัพท์", "Phone"), className: "w-[50%] md:w-[35%]", render: (item) => <div><p className="font-semibold">{item.model || item.deviceName || "—"}</p><p className="mt-1 font-mono text-xs text-blue-700">{item.deviceId}</p><p className="mt-2 text-xs text-slate-500 md:hidden">{siteName(item.siteId)}</p></div> },
      { key: "site", label: t("ไซต์", "Site"), secondary: true, render: (item) => siteName(item.siteId) },
      { key: "number", label: t("เบอร์โทรศัพท์", "Phone number"), secondary: true, render: (item) => item.phoneNumber || "—" },
      { key: "select", label: t("เลือก", "Select"), render: (item) => <button type="button" disabled={disabled} aria-label={t(`เลือกเครื่อง ${item.deviceId}`, `Select phone ${item.deviceId}`)} aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id)} className={`min-h-11 rounded-lg border px-2 text-xs font-medium ${selectedId === item.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>{selectedId === item.id ? t("เลือกแล้ว ✓", "Selected ✓") : t("เลือก", "Select")}</button> },
    ]} details={(item) => <dl className="grid grid-cols-2 gap-4 text-sm">{[["Device ID", item.deviceId], [t("รุ่น", "Model"), item.model || item.deviceName], [t("ผู้ผลิต", "Manufacturer"), item.manufacturer], [t("ไซต์", "Site"), siteName(item.siteId)], [t("เบอร์โทรศัพท์", "Phone number"), item.phoneNumber], ["IMEI", item.imei], ["Serial", item.serial]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1">{value || "—"}</dd></div>)}</dl>} />}
  </div>;
}
