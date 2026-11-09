"use client";

import { useState } from "react";
import { Send } from "@/components/shared/BrandIcon";
import type { InventoryItem } from "@/lib/inventory";
import type { DirectorySite } from "@/lib/directory";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { LoadingIcon } from "./LoadingIcon";

const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400";

/** Central-stock devices -> a site, pending the Site Leader's receipt confirmation. */
export function TransferPanel({ devices, sites, headers, onDone }: { devices: InventoryItem[]; sites: DirectorySite[]; headers: Record<string, string>; onDone: () => void }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [siteId, setSiteId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const central = devices.filter((item) => item.status === "registered" && !item.siteId);
  const activeSites = sites.filter((site) => site.active);
  function toggle(id: string) { setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  async function submit() {
    if (!selected.size || !siteId || saving) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/inventory/transfer", { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ deviceIds: [...selected], toSiteId: siteId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cannot transfer these devices");
      onDone();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Cannot transfer these devices"); }
    finally { setSaving(false); }
  }
  return <div className="space-y-5">
    <p className="text-sm leading-6 text-slate-500">{t("เลือกเครื่องในสต็อกส่วนกลางเพื่อส่งไปยังไซต์ สถานะจะเป็นอยู่ระหว่างขนส่งจนกว่าหัวหน้าไซต์ยืนยันรับเครื่อง", "Select central-stock devices to send to a site. They stay in transit until the Site Leader confirms receipt.")}</p>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
    {!central.length ? <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{t("ไม่มีเครื่องในสต็อกส่วนกลางให้โอนในขณะนี้", "No central-stock devices available to transfer right now.")}</p> : <>
      <div className="space-y-2">{central.map((item) => <label key={item.id} className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm"><input type="checkbox" disabled={saving} checked={selected.has(item.id)} onChange={() => toggle(item.id)} className="h-5 w-5 accent-blue-600" /><span className="flex-1"><strong className="text-blue-700">{item.deviceId}</strong><span className="ml-2 text-slate-500">{item.deviceName || item.model}</span></span></label>)}</div>
      <label className="block text-sm font-medium">{t("ไซต์ปลายทาง", "Destination site")}<select aria-label={t("Destination site")} required disabled={saving} value={siteId} onChange={(event) => setSiteId(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base"><option value="">{t("เลือกไซต์", "Select a site")}</option>{activeSites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
      <button type="button" disabled={!selected.size || !siteId || saving} aria-busy={saving} onClick={submit} className={button}>{saving ? <LoadingIcon /> : <Send size={16} />}{saving ? t("กำลังโอน…", "Transferring…") : t(`โอน ${selected.size} เครื่อง`, `Transfer ${selected.size} device(s)`)}</button>
    </>}
  </div>;
}
