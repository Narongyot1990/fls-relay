"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, ShieldCheck, Smartphone, Users } from "@/components/shared/BrandIcon";
import { PreviewSignature } from "@/components/preview/PreviewSignature";
import type { InventoryItem } from "@/lib/inventory";
import type { AccessoryReturnInput } from "@/lib/accessories";
import { useLanguage, LanguageSwitcher } from "@/components/shared/LanguageProvider";
import policy from "@/lib/policies/smartphone-handover.json";
import { AgreementTerms } from "./AgreementTerms";
import { DriverPicker } from "./DriverPicker";
import { LoadingIcon } from "./LoadingIcon";

export type HandoverPerson = { id: string; name: string; employeeNo: string; siteId: string; type: string; active: boolean };
const primary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400";
const panel = "rounded-xl border border-slate-200 bg-white p-5 sm:p-6";
const POLICY_VERSION = "Professional_Smartphone_Handover_Bilingual_EN_TH-v1";

export function HandoverReview({ devices, holders, central, siteName, onBack, onIssued, operatorName, operatorRole, headers, exchange, assignmentDevices = devices }: {
  devices: InventoryItem[]; holders: HandoverPerson[]; central: boolean;
  siteName: (id: string | null) => string; onBack: () => void; onIssued: () => void;
  operatorName?: string; operatorRole?: string; headers: Record<string, string>;
  exchange?: { driverId: string; newDeviceId: string; returningDeviceId: string; condition: "ok" | "damaged" } & AccessoryReturnInput;
  assignmentDevices?: InventoryItem[];
}) {
  const [step, setStep] = useState<1 | 2 | 3>(exchange ? 3 : 1);
  const [driverId, setDriverId] = useState(exchange?.driverId || "");
  const [phoneId, setPhoneId] = useState(exchange?.newDeviceId || "");
  const { language, revision, t } = useLanguage();
  const [signed, setSigned] = useState<{ revision: number; value: string } | null>(null);
  const [accepted, setAccepted] = useState<number | null>(null);
  const signature = signed?.revision === revision ? signed.value : null;
  const acknowledged = accepted === revision;
  const setSignature = (value: string | null) => setSigned(value ? { revision, value } : null);
  const setAcknowledged = (value: boolean) => setAccepted(value ? revision : null);
  const [accessories, setAccessories] = useState<number[]>([]);
  const [formRevision, setFormRevision] = useState(0);
  const [blankForm, setBlankForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [issued, setIssued] = useState(false);
  const drivers = holders.filter((person) => person.type === "driver" && person.active);
  const driver = drivers.find((person) => person.id === driverId);
  const eligible = devices.filter((phone) => !phone.holderId && ((phone.status === "in_site_stock" && phone.siteId === driver?.siteId) || (central && phone.status === "registered" && !phone.siteId)));
  const phone = eligible.find((item) => item.id === phoneId);
  function go(next: 1 | 2 | 3) { setStep(next); window.scrollTo({ top: 0, behavior: "instant" }); }
  async function submit() {
    if (!driver || !phone || !signature || !acknowledged || saving) return;
    setSaving(true); setSubmitError(null);
    try {
      const response = await fetch(exchange ? "/api/inventory/exchange" : "/api/inventory/issue", { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ ...exchange, deviceId: phone.id, driverId: driver.id, signature, accessories, policyVersion: POLICY_VERSION, policyLanguage: language, acknowledged }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cannot record this handover");
      setIssued(true);
    } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : "Cannot record this handover"); }
    finally { setSaving(false); }
  }

  return <div className="mx-auto max-w-3xl space-y-5">
    <button type="button" disabled={saving} onClick={() => { if (issued) onIssued(); else if (exchange || step === 1 || blankForm) onBack(); else { setSignature(null); setAcknowledged(false); go(step === 3 ? 2 : 1); } }} className="flex min-h-11 items-center gap-2 text-sm text-slate-500"><ArrowLeft size={16} />{t("ย้อนกลับ", "Back")}</button>
    <div><h1 className="text-2xl font-semibold">{step === 3 ? t("แบบฟอร์มรับมอบโทรศัพท์", "Phone receipt & acknowledgement") : t("ส่งมอบโทรศัพท์", "Issue a phone")}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{t("เลือกคนขับ → เลือกเครื่อง → ส่งมอบ → อ่านเงื่อนไขและเซ็น", "Select driver → Select phone → Hand over → Read and sign")}</p></div>
    <p className="rounded-lg border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-800">{t("Submit บันทึกการส่งมอบ ผู้ถือ และลายเซ็นจริงลงฐานข้อมูล ยังไม่สร้างไฟล์ PDF", "Submit records the assignment, holder and signature for real. A PDF document is not generated yet.")}</p>
    {exchange && <p className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">{t("เปลี่ยนเครื่อง: เซ็นรับเครื่องใหม่ก่อนยืนยัน ระบบจะรับคืนเครื่องเดิมและจ่ายเครื่องใหม่พร้อมกัน", "Exchange: sign for the replacement before confirming. The old phone return and replacement issue are saved together.")}</p>}
    <ol className="grid grid-cols-3 gap-2">{[t("เลือกคนขับ", "Driver"), t("เลือกโทรศัพท์", "Phone"), t("อ่านและเซ็นรับ", "Read & sign")].map((label, index) => <li key={index} aria-current={step === index + 1 ? "step" : undefined} className={`flex items-center gap-2 border-b-2 pb-4 text-xs sm:text-sm ${step >= index + 1 ? "border-blue-600 text-blue-600" : "border-slate-200 text-slate-400"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${step >= index + 1 ? "bg-blue-600 text-white" : "bg-slate-200"}`}>{step > index + 1 ? <Check size={13} /> : index + 1}</span>{label}</li>)}</ol>
    {step === 1 && <section className={panel}>
      <h2 className="text-lg font-semibold">{t("ใครเป็นผู้รับโทรศัพท์?")}</h2><p className="mt-2 mb-5 text-sm text-slate-500">{t("รายชื่อคนขับจริงในขอบเขตที่คุณเข้าถึง")}</p>
      <DriverPicker holders={holders} devices={assignmentDevices} value={driverId} onChange={(id) => { setDriverId(id); setPhoneId(""); setAccessories([]); setSignature(null); setAcknowledged(false); }} />
      {assignmentDevices.some((device) => device.status === "assigned" && device.holderId === driverId) && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t("คนขับมีเครื่องอยู่แล้ว โปรดตรวจรายละเอียดก่อนจ่ายเพิ่ม หรือใช้เมนูเปลี่ยนเครื่อง", "This driver already has a phone. Review the details before issuing another, or use Exchange.")}</p>}
      <div className="mt-6 flex justify-end"><button type="button" disabled={!driver} onClick={() => go(2)} className={primary}>{t("ถัดไป เลือกโทรศัพท์")}<ArrowRight size={17} /></button></div>
    </section>}
    {step === 2 && <section className={panel}>
      <div className="mb-6 flex items-center gap-3 rounded-lg bg-slate-50 p-3"><Users size={20} className="text-blue-600" /><div><p className="text-xs text-slate-500">{t("ส่งมอบให้")}</p><p className="mt-1 text-sm font-semibold">{driver?.name} · {driver?.employeeNo || "—"}</p></div></div>
      <h2 className="text-lg font-semibold">{t("เลือกเครื่องพร้อมจ่าย")}</h2><p className="mt-2 mb-5 text-sm leading-6 text-slate-500">{t("แสดงเครื่องพร้อมจ่ายที่ไซต์ของคนขับ และสต็อกส่วนกลางสำหรับทีมดำเนินการ")}</p>
      <div className="grid gap-3 sm:grid-cols-2">{eligible.map((item) => <button key={item.id} type="button" aria-pressed={phoneId === item.id} onClick={() => { setPhoneId(item.id); setAccessories([]); setSignature(null); setAcknowledged(false); }} className={`rounded-xl border p-4 text-left ${phoneId === item.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}><Smartphone size={26} className="mb-4 text-blue-600" /><p className="font-semibold">{item.model || item.deviceName || t("ไม่ระบุรุ่น")}</p><p className="mt-2 break-all text-sm text-blue-600">{item.deviceId}</p><p className="mt-2 text-xs text-slate-500">{item.phoneNumber || t("ยังไม่มีเบอร์โทร")} · {siteName(item.siteId)}</p>{phoneId === item.id && <p className="mt-3 text-xs text-blue-600">{t("เลือกแล้ว ✓")}</p>}</button>)}</div>
      {!eligible.length && <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">{t("ไม่มีเครื่องที่พร้อมจ่ายในขอบเขตนี้")}</p>}
      <div className="mt-6 flex justify-end"><button type="button" disabled={!phone} onClick={() => go(3)} className={primary}>{t("ส่งมอบ · เปิดแบบฟอร์ม")}<ArrowRight size={17} /></button></div>
    </section>}
    {step !== 3 && <button type="button" onClick={() => { setBlankForm(true); setDriverId(""); setPhoneId(""); go(3); }} className="min-h-11 text-sm text-blue-600 underline">{t("ดูรูปแบบฟอร์มเปล่าเพื่อรีวิว โดยไม่เลือกหรือสร้างข้อมูลสมมติ")}</button>}
    {step === 3 && issued && <section className={panel}>
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><Check size={20} />{t("บันทึกการส่งมอบแล้ว", "Handover recorded")}</p>
      <p className="mt-3 text-sm leading-6 text-slate-600">{t(`${driver?.name} ได้รับ ${phone?.deviceId} เข้าสู่ระบบแล้ว`, `${driver?.name} is now assigned ${phone?.deviceId}.`)}</p>
      <button type="button" onClick={onIssued} className={`${primary} mt-5`}>{t("กลับเมนูหลัก", "Back to menu")}</button>
    </section>}
    {step === 3 && !issued && <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="flex items-center gap-2 text-sm text-blue-800"><ShieldCheck size={20} />{t("ยื่นหน้าจอให้คนขับอ่านและเซ็นที่ท้ายฟอร์ม", "Hand the screen to the driver to read and sign below")}</p><LanguageSwitcher /></div>
      <section className={panel}>
        <div className="border-b border-slate-200 pb-6"><p className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-widest text-blue-600"><FileText size={17} />FLS TRANSPORT</p><h2 className="text-xl font-semibold">{policy.title[language]}</h2><p className="mt-3 text-xs leading-6 text-slate-500">{t("ตรวจชื่อคนขับและเครื่องก่อนเซ็น Submit จะบันทึกการรับมอบจริง", "Check the driver and device before signing. Submit records the handover.")}{blankForm && t(" · ฟอร์มเปล่า ไม่ผูกกับรายการจริง", " · Blank form; no assignment selected")}</p>
          <dl className="mt-6 grid grid-cols-2 gap-5 text-sm">{policy.fields.map((field, index) => <div key={field.en}><dt className="text-xs text-slate-500">{field[language].replace(/_{2,}.*/, "").trim()}</dt><dd className="mt-2 break-all font-medium">{[driver?.name, driver?.employeeNo, "", phone?.phoneNumber, phone?.model, [phone?.imei, phone?.serial].filter(Boolean).join(" / "), "", ""][index] || "—"}</dd></div>)}
            <div><dt className="text-xs text-slate-500">Device ID</dt><dd className="mt-2 break-all font-medium">{phone?.deviceId || "—"}</dd></div><div><dt className="text-xs text-slate-500">{t("ไซต์", "Site")}</dt><dd className="mt-2 font-medium">{driver ? siteName(driver.siteId) : "—"}</dd></div>
          </dl>
        </div>
        <AgreementTerms accessories={accessories} onAccessoriesChange={(items) => { setAccessories(items); setSignature(null); setAcknowledged(false); setFormRevision((value) => value + 1); }} />
        <div className="border-t border-slate-200 pt-6"><h3 className="font-semibold">{t("ผู้เซ็นรับ · คนขับ", "Receipt signed by · Driver")}</h3><p className="mt-2 text-sm">{driver?.name || "—"}</p><p className="mt-2 mb-4 text-sm text-slate-500">{t("ใช้นิ้วหรือปากกาวาดลายมือชื่อในกรอบ", "Use a finger or stylus to sign inside the box")}</p><PreviewSignature key={`${revision}:${formRevision}`} onChange={setSignature} label={t("พื้นที่ลงลายมือชื่อ", "Signature area")} clearLabel={t("ล้างลายมือชื่อ แล้วเซ็นใหม่", "Clear signature and sign again")} />
          <label className="mt-5 flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm leading-6"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" /><span>{policy.acknowledgement[language]}</span></label>
          {signature && acknowledged && !submitError && <p role="status" className="mt-4 text-sm text-blue-700">{t("พร้อมบันทึก กด Submit เพื่อยืนยันการส่งมอบ", "Ready to record. Press Submit to confirm this handover.")}</p>}
          <section className="mt-6 rounded-lg bg-slate-50 p-4"><h3 className="font-medium">{t("ผู้ดำเนินการส่งมอบ · ตัวแทนบริษัท", "Issuing operator · Company representative")}</h3><dl className="mt-3 grid grid-cols-2 gap-4 text-sm">{policy.representativeFields.map((field, index) => <div key={field.en}><dt className="text-xs text-slate-500">{field[language].replace(/_{2,}.*/, "").trim()}</dt><dd className="mt-1">{[operatorName, operatorRole, "", ""][index] || "—"}</dd></div>)}</dl></section>
          {submitError && <p role="alert" className="mt-4 text-sm text-red-700">{t(submitError)}</p>}
          <button type="button" disabled={!driver || !phone || !signature || !acknowledged || saving} aria-busy={saving} aria-describedby="handover-submit-status" onClick={submit} className={`${primary} mt-5 w-full`}>{saving && <LoadingIcon />}{saving ? t("กำลังบันทึก…") : t("Submit · ยืนยันรับมอบ", "Submit · Confirm receipt")}</button><p id="handover-submit-status" className="mt-3 text-xs leading-6 text-slate-500">{t("บันทึกผู้ถือเครื่อง ลายเซ็น และรายการอุปกรณ์จริง", "Records the holder, signature and accessory checklist for real.")}</p>
        </div>
      </section>
    </>}
  </div>;
}
