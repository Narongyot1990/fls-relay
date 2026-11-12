"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Smartphone, Undo2, Users } from "@/components/shared/BrandIcon";
import type { InventoryItem } from "@/lib/inventory";
import type { HandoverPerson } from "./HandoverReview";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { DriverPicker } from "./DriverPicker";
import { LoadingIcon } from "./LoadingIcon";
import { ReturnAccessories, useAccessoryReturn } from "./ReturnAccessories";
import { StepProgress } from "./StepProgress";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400";
const panel = "rounded-xl border border-slate-200 bg-white p-5 sm:p-6";
const backLink = "mb-5 flex min-h-11 items-center gap-2 text-sm text-slate-500";

export function ReturnPanel({ devices, holders, headers, onDone }: { devices: InventoryItem[]; holders: HandoverPerson[]; headers: Record<string, string>; onDone: () => void }) {
  const { t } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [driverId, setDriverId] = useState("");
  const [recall, setRecall] = useState(false);
  const [reason, setReason] = useState("");
  const [condition, setCondition] = useState<"ok" | "damaged">("ok");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drivers = holders.filter((person) => person.type === "driver");
  const driver = drivers.find((person) => person.id === driverId);
  const [deviceId, setDeviceId] = useState("");
  const assignments = devices.filter((item) => item.status === "assigned" && item.holderId === driverId);
  const assigned = assignments.find((item) => item.id === deviceId) || assignments[0];
  const accessoryReturn = useAccessoryReturn(assigned);
  const labels = [t("เลือกคนขับ", "Driver"), t("รายละเอียด", "Details"), t("ยืนยัน", "Confirm")];
  function go(next: 1 | 2 | 3) { setStep(next); window.scrollTo({ top: 0, behavior: "instant" }); }
  async function submit() {
    if (!assigned || saving || !accessoryReturn.ready || (recall && !reason.trim())) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/inventory/return", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: assigned.id, condition, recall, reason, ...accessoryReturn.value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cannot record this return");
      onDone();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cannot record this return"); }
    finally { setSaving(false); }
  }
  return <div className="space-y-5">
    <StepProgress step={step} labels={labels} />
    {step === 1 && <section className={panel}>
      <h2 className="text-lg font-semibold">{t("ใครกำลังคืนเครื่อง?", "Who is returning a phone?")}</h2>
      <p className="mt-2 mb-5 text-sm text-slate-500">{t("เลือกคนขับและเครื่องที่ถืออยู่เพื่อดำเนินการ", "Select a driver and their assigned phone to continue.")}</p>
      <DriverPicker holders={holders} devices={devices} assignedOnly disabled={saving} value={driverId} onChange={(id) => { setDriverId(id); setDeviceId(""); }} />
      {assignments.length > 1 && <label className="mt-4 block text-sm">{t("เลือกเครื่องที่รับคืน", "Returning phone")}<select aria-label={t("เลือกเครื่องที่รับคืน", "Returning phone")} disabled={saving} value={assigned?.id || ""} onChange={(event) => setDeviceId(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border bg-white px-3">{assignments.map((item) => <option key={item.id} value={item.id}>{item.model || item.deviceName} · {item.deviceId}</option>)}</select></label>}
      {driver && !assigned && <p className="mt-3 text-sm text-slate-500">{t("คนขับคนนี้ไม่มีเครื่องที่จ่ายอยู่ในขอบเขตนี้", "This driver has no assigned device in this scope.")}</p>}
      <div className="mt-6 flex justify-end"><button type="button" disabled={!assigned} onClick={() => go(2)} className={button}>{t("ถัดไป · รายละเอียดการคืน", "Next · Return details")}<ArrowRight size={17} /></button></div>
    </section>}
    {step === 2 && driver && assigned && <section className={panel}>
      <button type="button" onClick={() => go(1)} disabled={saving} className={backLink}><ArrowLeft size={16} />{t("ย้อนกลับ", "Back")}</button>
      <div className="mb-6 flex items-center gap-3 rounded-lg bg-slate-50 p-3"><Users size={20} className="text-blue-600" /><div><p className="text-xs text-slate-500">{t("รับคืนจาก", "Returning from")}</p><p className="mt-1 text-sm font-semibold">{driver.name} · {driver.employeeNo || "—"}</p></div></div>
      <div className="flex items-center gap-3"><Smartphone size={22} className="text-blue-600" /><div><p className="font-semibold text-blue-700">{assigned.deviceId}</p><p className="text-xs text-slate-500">{assigned.deviceName || assigned.model}</p></div></div>
      <div role="group" aria-label={t("วิธีรับคืน", "Return mode")} className="mt-5 flex gap-2">{[false, true].map((value) => <button type="button" key={String(value)} disabled={saving} aria-pressed={recall === value} onClick={() => setRecall(value)} className={`min-h-11 rounded-lg border px-4 text-sm ${recall === value ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>{value ? t("เรียกคืนโทรศัพท์", "Recall phone") : t("รับคืนตามปกติ", "Normal return")}</button>)}</div>
      {recall && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t("ยืนยันเมื่อได้รับเครื่องคืนจริงแล้ว ระบบจะปิดการถือครองและบันทึกเหตุผล", "Confirm after physically receiving the phone. This closes the assignment and records the reason.")}</p>}
      <label className="mt-5 block text-sm font-medium">{recall ? t("เหตุผลที่เรียกคืน (จำเป็น)", "Recall reason (required)") : t("หมายเหตุการรับคืน", "Return notes")}<textarea disabled={saving} required={recall} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 bg-white p-3" /></label>
      <fieldset className="mt-5"><legend className="text-sm font-medium">{t("สภาพเครื่องเมื่อรับคืน", "Condition on return")}</legend>
        <div className="mt-2 flex gap-3">{(["ok", "damaged"] as const).map((value) => <label key={value} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm ${condition === value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200"}`}><input type="radio" name="condition" className="sr-only" checked={condition === value} disabled={saving} onChange={() => setCondition(value)} />{value === "ok" ? t("ใช้งานได้ปกติ", "OK") : t("เสียหาย", "Damaged")}</label>)}</div>
      </fieldset>
      <ReturnAccessories device={assigned} value={accessoryReturn.value} onChange={accessoryReturn.setValue} disabled={saving} />
      <div className="mt-6 flex justify-end"><button type="button" disabled={!accessoryReturn.ready || (recall && !reason.trim())} onClick={() => go(3)} className={button}>{t("ถัดไป · ยืนยัน", "Next · Confirm")}<ArrowRight size={17} /></button></div>
    </section>}
    {step === 3 && driver && assigned && <section className={panel}>
      <button type="button" onClick={() => go(2)} disabled={saving} className={backLink}><ArrowLeft size={16} />{t("ย้อนกลับ", "Back")}</button>
      <h2 className="text-lg font-semibold">{t("ตรวจสอบก่อนบันทึก", "Review before saving")}</h2>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
      <dl className="mt-5 grid grid-cols-2 gap-5 text-sm">
        <div><dt className="text-xs text-slate-500">{t("คนขับ", "Driver")}</dt><dd className="mt-2 font-medium">{driver.name}</dd></div>
        <div><dt className="text-xs text-slate-500">Device ID</dt><dd className="mt-2 break-all font-medium">{assigned.deviceId}</dd></div>
        <div><dt className="text-xs text-slate-500">{t("วิธีรับคืน", "Return mode")}</dt><dd className="mt-2 font-medium">{recall ? t("เรียกคืนโทรศัพท์", "Recall phone") : t("รับคืนตามปกติ", "Normal return")}</dd></div>
        <div><dt className="text-xs text-slate-500">{t("สภาพเครื่อง", "Condition")}</dt><dd className="mt-2 font-medium">{condition === "ok" ? t("ใช้งานได้ปกติ", "OK") : t("เสียหาย", "Damaged")}</dd></div>
        {reason.trim() && <div className="col-span-2"><dt className="text-xs text-slate-500">{recall ? t("เหตุผลที่เรียกคืน", "Recall reason") : t("หมายเหตุการรับคืน", "Return notes")}</dt><dd className="mt-2 break-words font-medium">{reason}</dd></div>}
      </dl>
      <button type="button" disabled={saving || !accessoryReturn.ready || (recall && !reason.trim())} aria-busy={saving} onClick={submit} className={`${button} mt-6 w-full`}>{saving ? <LoadingIcon /> : <Undo2 size={16} />}{saving ? t("กำลังบันทึก…") : recall ? t("ยืนยันเรียกคืนและรับเครื่องแล้ว", "Confirm recall and receipt") : t("รับคืนเครื่อง", "Record return")}</button>
    </section>}
  </div>;
}
