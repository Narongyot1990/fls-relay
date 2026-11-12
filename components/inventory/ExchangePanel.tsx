"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ArrowRightLeft, Smartphone, Users } from "@/components/shared/BrandIcon";
import type { InventoryItem } from "@/lib/inventory";
import { HandoverReview, type HandoverPerson } from "./HandoverReview";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { DriverPicker } from "./DriverPicker";
import { ReturnAccessories, useAccessoryReturn } from "./ReturnAccessories";
import { StepProgress } from "./StepProgress";
import { PhoneChoiceList } from "./PhoneChoiceList";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400";
const panel = "rounded-xl border border-slate-200 bg-white p-5 sm:p-6";
const backLink = "mb-5 flex min-h-11 items-center gap-2 text-sm text-slate-500";

export function ExchangePanel({ devices, holders, headers, onDone, siteName }: { devices: InventoryItem[]; holders: HandoverPerson[]; headers: Record<string, string>; onDone: () => void; siteName: (id: string | null) => string }) {
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2>(1);
  const [driverId, setDriverId] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [condition, setCondition] = useState<"ok" | "damaged">("ok");
  const [signing, setSigning] = useState(false);
  const drivers = holders.filter((person) => person.type === "driver");
  const driver = drivers.find((person) => person.id === driverId);
  const [deviceId, setDeviceId] = useState("");
  const assignments = devices.filter((item) => item.status === "assigned" && item.holderId === driverId);
  const assigned = assignments.find((item) => item.id === deviceId) || assignments[0];
  const accessoryReturn = useAccessoryReturn(assigned);
  const eligible = devices.filter((item) => !item.holderId && item.id !== assigned?.id &&
    ((item.status === "in_site_stock" && item.siteId === driver?.siteId) || (headers["X-Inventory-Role"] === "implementation" && item.status === "registered" && !item.siteId)));
  const labels: [string, string, string] = [t("เลือกคนขับ", "Driver"), t("สภาพและเครื่องใหม่", "Condition & replacement"), t("เซ็นรับเครื่องใหม่", "Sign")];
  if (signing && driver && assigned && newDeviceId) return <HandoverReview devices={devices} holders={holders} headers={headers} central={headers["X-Inventory-Role"] === "implementation"} siteName={siteName} operatorName={holders.find((person) => person.id === headers["X-Inventory-Leader"])?.name} operatorRole={headers["X-Inventory-Role"]} onBack={() => setSigning(false)} onIssued={onDone} exchange={{ driverId, newDeviceId, returningDeviceId: assigned.id, condition, ...accessoryReturn.value }} stepLabels={labels} />;
  return <div className="space-y-5">
    <StepProgress step={step} labels={labels} />
    {step === 1 && <section className={panel}>
      <h2 className="text-lg font-semibold">{t("ใครจะเปลี่ยนเครื่อง?", "Who is exchanging a phone?")}</h2>
      <p className="mt-2 mb-5 text-sm text-slate-500">{t("เลือกคนขับและเครื่องที่ถืออยู่เพื่อดำเนินการ", "Select a driver and their assigned phone to continue.")}</p>
      <DriverPicker holders={holders} devices={devices} assignedOnly value={driverId} onChange={(id) => { setDriverId(id); setDeviceId(""); }} />
      {assignments.length > 1 && <label className="mt-4 block text-sm">{t("เลือกเครื่องที่รับคืน", "Returning phone")}<select aria-label={t("เลือกเครื่องที่รับคืน", "Returning phone")} value={assigned?.id || ""} onChange={(event) => setDeviceId(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border bg-white px-3">{assignments.map((item) => <option key={item.id} value={item.id}>{item.model || item.deviceName} · {item.deviceId}</option>)}</select></label>}
      {driver && !assigned && <p className="mt-3 text-sm text-slate-500">{t("คนขับคนนี้ไม่มีเครื่องที่จ่ายอยู่ในขอบเขตนี้", "This driver has no assigned device in this scope.")}</p>}
      {driver && assigned && !driver.active && <p className="mt-3 text-sm text-amber-700">{t("คนขับหยุดใช้งานแล้ว กรุณาใช้เมนูรับคืน", "This driver is inactive. Use Return instead.")}</p>}
      <div className="mt-6 flex justify-end"><button type="button" disabled={!driver || !assigned || !driver.active} onClick={() => setStep(2)} className={button}>{t("ถัดไป · สภาพและเครื่องใหม่", "Next · Condition & replacement")}<ArrowRight size={17} /></button></div>
    </section>}
    {step === 2 && driver && assigned && <section className={panel}>
      <button type="button" onClick={() => setStep(1)} className={backLink}><ArrowLeft size={16} />{t("ย้อนกลับ", "Back")}</button>
      <div className="mb-6 flex items-center gap-3 rounded-lg bg-slate-50 p-3"><Users size={20} className="text-blue-600" /><div><p className="text-xs text-slate-500">{t("เปลี่ยนเครื่องให้", "Exchanging for")}</p><p className="mt-1 text-sm font-semibold">{driver.name} · {driver.employeeNo || "—"}</p></div></div>
      <p className="text-xs text-slate-500">{t("เครื่องที่จะรับคืน", "Returning device")}</p>
      <div className="mt-2 flex items-center gap-3"><Smartphone size={22} className="text-blue-600" /><div><p className="font-semibold text-blue-700">{assigned.deviceId}</p><p className="text-xs text-slate-500">{assigned.deviceName || assigned.model}</p></div></div>
      <fieldset className="mt-5"><legend className="text-sm font-medium">{t("สภาพเครื่องเดิมเมื่อรับคืน", "Condition of the returning device")}</legend>
        <div className="mt-2 flex gap-3">{(["ok", "damaged"] as const).map((value) => <label key={value} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm ${condition === value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200"}`}><input type="radio" name="condition" className="sr-only" checked={condition === value} onChange={() => setCondition(value)} />{value === "ok" ? t("ใช้งานได้ปกติ", "OK") : t("เสียหาย", "Damaged")}</label>)}</div>
      </fieldset>
      <ReturnAccessories device={assigned} value={accessoryReturn.value} onChange={accessoryReturn.setValue} />
      <p className="mt-5 text-xs text-slate-500">{t("เลือกเครื่องใหม่ที่จะจ่ายแทน", "Select the new device to issue instead")}</p>
      <PhoneChoiceList devices={eligible} selectedId={newDeviceId} onSelect={setNewDeviceId} siteName={siteName} card={(item) => <button key={item.id} type="button" aria-pressed={newDeviceId === item.id} onClick={() => setNewDeviceId(item.id)} className={`rounded-xl border p-3 text-left text-sm ${newDeviceId === item.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><p className="font-semibold text-blue-700">{item.deviceId}</p><p className="text-xs text-slate-500">{item.deviceName || item.model}</p></button>} />
      {!eligible.length && <p className="mt-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{t("ไม่มีเครื่องที่พร้อมจ่ายในขอบเขตนี้")}</p>}
      <div className="mt-6 flex justify-end"><button type="button" disabled={!eligible.some((item) => item.id === newDeviceId) || !accessoryReturn.ready} onClick={() => setSigning(true)} className={button}><ArrowRightLeft size={16} />{t("ถัดไป · เซ็นรับเครื่องใหม่", "Continue · Sign for replacement")}</button></div>
    </section>}
  </div>;
}
