"use client";

import { useState } from "react";
import { Search, Smartphone, Undo2, Users } from "lucide-react";
import type { InventoryItem } from "@/lib/inventory";
import type { HandoverPerson } from "./HandoverReview";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { LoadingIcon } from "./LoadingIcon";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400";

export function ReturnPanel({ devices, holders, headers, onDone }: { devices: InventoryItem[]; holders: HandoverPerson[]; headers: Record<string, string>; onDone: () => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [driverId, setDriverId] = useState("");
  const [condition, setCondition] = useState<"ok" | "damaged">("ok");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drivers = holders.filter((person) => person.type === "driver" && person.active);
  const matches = drivers.filter((person) => `${person.name} ${person.employeeNo}`.toLowerCase().includes(query.trim().toLowerCase()));
  const driver = drivers.find((person) => person.id === driverId);
  const assigned = devices.find((item) => item.status === "assigned" && item.holderId === driverId);
  async function submit() {
    if (!assigned || saving) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/inventory/return", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: assigned.id, condition }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cannot record this return");
      onDone();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cannot record this return"); }
    finally { setSaving(false); }
  }
  return <div className="space-y-5">
    <label className="relative block"><span className="sr-only">{t("ค้นหาคนขับ")}</span><Search size={18} className="absolute top-3.5 left-3 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setDriverId(""); }} placeholder={t("ค้นหาชื่อหรือรหัสพนักงาน FLS")} className="min-h-12 w-full rounded-lg border border-slate-200 pr-3 pl-10 text-base" /></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
    {query && <div className="space-y-2">{matches.map((person) => <button key={person.id} type="button" aria-pressed={driverId === person.id} onClick={() => setDriverId(person.id)} className={`flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left text-sm ${driverId === person.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}><Users size={18} className="text-slate-400" /><span><strong>{person.name}</strong><span className="ml-2 text-slate-500">{person.employeeNo}</span></span></button>)}
      {!matches.length && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">{t("ไม่พบรายชื่อที่ค้นหา")}</p>}</div>}
    {driver && <div className="rounded-xl border border-slate-200 bg-white p-5">
      {assigned ? <>
        <div className="flex items-center gap-3"><Smartphone size={22} className="text-blue-600" /><div><p className="font-semibold text-blue-700">{assigned.deviceId}</p><p className="text-xs text-slate-500">{assigned.deviceName || assigned.model}</p></div></div>
        <fieldset className="mt-5"><legend className="text-sm font-medium">{t("สภาพเครื่องเมื่อรับคืน", "Condition on return")}</legend>
          <div className="mt-2 flex gap-3">{(["ok", "damaged"] as const).map((value) => <label key={value} className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border px-3 text-sm ${condition === value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200"}`}><input type="radio" name="condition" className="sr-only" checked={condition === value} onChange={() => setCondition(value)} />{value === "ok" ? t("ใช้งานได้ปกติ", "OK") : t("เสียหาย", "Damaged")}</label>)}</div>
        </fieldset>
        <button type="button" disabled={saving} aria-busy={saving} onClick={submit} className={`${button} mt-5 w-full`}>{saving ? <LoadingIcon /> : <Undo2 size={16} />}{saving ? t("กำลังบันทึก…") : t("รับคืนเครื่อง", "Record return")}</button>
      </> : <p className="text-sm text-slate-500">{t("คนขับคนนี้ไม่มีเครื่องที่จ่ายอยู่ในขอบเขตนี้", "This driver has no assigned device in this scope.")}</p>}
    </div>}
  </div>;
}
