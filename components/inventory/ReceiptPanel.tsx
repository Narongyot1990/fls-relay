"use client";

import { useState } from "react";
import { CheckCircle2 } from "@/components/shared/BrandIcon";
import type { InventoryItem } from "@/lib/inventory";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { LoadingIcon } from "./LoadingIcon";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400";

/** Site Leader confirms devices Implementation already sent — see TransferPanel. */
export function ReceiptPanel({ devices, headers, onDone }: { devices: InventoryItem[]; headers: Record<string, string>; onDone: () => void }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const incoming = devices.filter((item) => item.status === "in_transit");
  function toggle(id: string) { setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  async function submit() {
    if (!selected.size || saving) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/inventory/receipt", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ deviceIds: [...selected] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cannot confirm receipt");
      onDone();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cannot confirm receipt"); }
    finally { setSaving(false); }
  }
  return <div className="space-y-5">
    <p className="text-sm leading-6 text-slate-500">{t("ยืนยันเครื่องที่ส่งมาถึงไซต์ของคุณ เครื่องจะเข้าสต็อกของไซต์ทันทีที่ยืนยัน", "Confirm devices that have arrived at your site. They join your site stock the moment you confirm.")}</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
    {!incoming.length ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{t("ไม่มีเครื่องที่อยู่ระหว่างขนส่งมายังไซต์นี้", "No devices are in transit to this site right now.")}</p> : <>
      <div className="space-y-2">{incoming.map((item) => <label key={item.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"><input type="checkbox" disabled={saving} checked={selected.has(item.id)} onChange={() => toggle(item.id)} className="h-5 w-5 accent-blue-600" /><span className="flex-1"><strong className="text-blue-700">{item.deviceId}</strong><span className="ml-2 text-slate-500">{item.deviceName || item.model}</span></span></label>)}</div>
      <button type="button" disabled={!selected.size || saving} aria-busy={saving} onClick={submit} className={button}>{saving ? <LoadingIcon /> : <CheckCircle2 size={16} />}{saving ? t("กำลังยืนยัน…", "Confirming…") : t(`ยืนยันรับ ${selected.size} เครื่อง`, `Confirm ${selected.size} device(s)`)}</button>
    </>}
  </div>;
}
