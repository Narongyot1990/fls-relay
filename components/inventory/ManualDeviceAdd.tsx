"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { InventoryItem } from "@/lib/inventory";
import { LoadingIcon } from "./LoadingIcon";

const input = "mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base disabled:bg-slate-50";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-50";
const fields = ["deviceId", "deviceName", "model", "imei", "serial", "phoneNumber"] as const;
const empty = { deviceId: "", deviceName: "", model: "", imei: "", serial: "", phoneNumber: "" };

export function ManualDeviceAdd({ headers, onAdded }: { headers: Record<string, string>; onAdded: () => void }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<InventoryItem | null>(null);
  const labels: Record<(typeof fields)[number], string> = {
    deviceId: "Device ID", deviceName: t("ชื่อเครื่อง", "Device name"), model: t("รุ่น", "Model"),
    imei: t("IMEI (ไม่บังคับ)", "IMEI (optional)"), serial: t("Serial (ไม่บังคับ)", "Serial (optional)"), phoneNumber: t("เบอร์โทรศัพท์", "Phone number"),
  };

  async function submit() {
    if (busy || !form.deviceId.trim()) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/inventory", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add this device");
      setAdded(data.device); setForm(empty); onAdded();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add this device"); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <p className="text-sm leading-6 text-slate-500">{t("เพิ่มเครื่องทีละเครื่องเข้าสต็อกส่วนกลาง ไม่มีผู้ถือเครื่อง — ใช้เมื่อยังไม่มีไฟล์ Excel/CSV", "Add one device at a time into central stock, with no holder — use this when there's no Excel/CSV file yet.")}</p>
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} aria-busy={busy} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => <label key={field} className="text-sm font-medium">{labels[field]}<input required={field === "deviceId"} maxLength={200} value={form[field]} disabled={busy} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className={input} /></label>)}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
      <button type="submit" disabled={busy || !form.deviceId.trim()} aria-busy={busy} className={button}>{busy && <LoadingIcon />}{busy ? t("กำลังบันทึก…", "Saving…") : t("บันทึกลงฐานข้อมูลจริง", "Save to the real database")}</button>
    </form>
    {added && <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={18} />{t("เพิ่ม ", "Added ")}<strong>{added.deviceId}</strong>{t(" แล้ว เปิดรายการเครื่องเพื่อแก้ไขเพิ่มเติม", " — open Devices to edit it further.")}</p>}
  </div>;
}
