"use client";

import { useState } from "react";
import { MapPin, Plus, Search, Users } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { DirectoryPerson, DirectorySite } from "@/lib/directory";
import { LoadingIcon } from "./LoadingIcon";

const input = "mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base disabled:bg-slate-50";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-50";

export function DirectoryPanel({ kind, sites, people, canManage, pending, headers, onBusyChange, onCreated, onOpenSites, onSiteView }: {
  kind: "sites" | "people"; sites: DirectorySite[]; people: DirectoryPerson[]; canManage: boolean; pending: boolean;
  headers: Record<string, string>; onBusyChange: (busy: boolean) => void;
  onCreated: (result: { kind: "sites" | "people"; siteId: string }) => void;
  onOpenSites: () => void; onSiteView: (siteId: string) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [form, setForm] = useState({ name: "", code: "", employeeNo: "", type: "driver", siteId: "", phone: "" });
  const activeSites = sites.filter((site) => site.active);
  const siteName = (id: string) => sites.find((site) => site.id === id)?.name || "—";
  async function submit() {
    if (busy || pending) return;
    setBusy(true); onBusyChange(true); setError(null);
    try {
      const response = await fetch(`/api/inventory/${kind}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(kind === "sites" ? { code: form.code, name: form.name } : { name: form.name, employeeNo: form.employeeNo, type: form.type, siteId: form.siteId, phone: form.phone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not add this record");
      setOpen(false); setForm({ name: "", code: "", employeeNo: "", type: "driver", siteId: "", phone: "" });
      onCreated({ kind, siteId: kind === "sites" ? data.site.id : data.person.siteId });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not add this record"); }
    finally { setBusy(false); onBusyChange(false); }
  }
  const filteredPeople = people.filter((person) => (typeFilter === "all" || person.type === typeFilter) && `${person.name} ${person.employeeNo}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><p className="max-w-2xl text-sm leading-6 text-slate-500">{kind === "sites" ? t("สร้างไซต์ก่อน แล้วเพิ่ม Site Leader และคนขับเข้าสังกัด การสร้างไซต์ยังไม่โอนหรือจัดสรรโทรศัพท์", "Create sites first, then register their Site Leaders and drivers. Creating a site does not transfer or assign phones.") : t("แยก Driver กับ Site Leader และใช้ FLS Employee ID ไม่ซ้ำ ทั้งสองประเภทต้องมีไซต์สังกัด ส่วน IT, Implementation และ Admin เป็นบทบาทส่วนกลาง", "Keep Driver and Site Leader identities separate, each with a unique FLS Employee ID and an assigned site. IT, Implementation and Admin remain central roles.")}</p>{canManage && <button type="button" disabled={busy || pending} onClick={() => { setOpen(!open); setError(null); }} className={button}><Plus size={17} />{kind === "sites" ? t("เพิ่มไซต์", "Add site") : t("เพิ่มบุคลากร", "Add person")}</button>}</div>
    {open && canManage && <form aria-label={kind === "sites" ? t("เพิ่มไซต์", "Add site") : t("เพิ่มบุคลากร", "Add person")} onSubmit={(event) => { event.preventDefault(); submit(); }} aria-busy={busy} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{kind === "sites" ? t("เพิ่มไซต์", "Add site") : t("เพิ่มบุคลากร", "Add person")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">{kind === "sites" ? t("ชื่อไซต์", "Site name") : t("ชื่อ-นามสกุล", "Full name")}<input required maxLength={120} value={form.name} disabled={busy} onChange={(event) => setForm({ ...form, name: event.target.value })} className={input} /></label>
        {kind === "sites" ? <label className="text-sm font-medium">{t("รหัสไซต์", "Site code")}<input aria-label={t("Site code")} required minLength={2} maxLength={24} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,23}" value={form.code} disabled={busy} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} className={input} /><span className="mt-2 block text-xs font-normal text-slate-400">{t("ใช้รหัสคงที่ 2–24 ตัว: ตัวอักษรอังกฤษ ตัวเลข - หรือ _", "Use a stable 2–24 character code: letters, numbers, - or _.")}</span></label> : <>
          <label className="text-sm font-medium">FLS Employee ID<input required maxLength={64} value={form.employeeNo} disabled={busy} onChange={(event) => setForm({ ...form, employeeNo: event.target.value })} className={input} /></label>
          <label className="text-sm font-medium">{t("ประเภทบุคลากร", "Person type")}<select aria-label={t("Person type")} value={form.type} disabled={busy} onChange={(event) => setForm({ ...form, type: event.target.value })} className={input}><option value="driver">Driver</option><option value="site_leader">Site Leader</option></select></label>
          <label className="text-sm font-medium">{t("ไซต์สังกัด", "Assigned site")}<select aria-label={t("Assigned site")} required value={form.siteId} disabled={busy || !activeSites.length} onChange={(event) => setForm({ ...form, siteId: event.target.value })} className={input}><option value="">{t("เลือกไซต์", "Select a site")}</option>{activeSites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.code}</option>)}</select></label>
          <label className="text-sm font-medium">{t("เบอร์โทรศัพท์ (ไม่บังคับ)", "Phone number (optional)")}<input type="tel" maxLength={40} value={form.phone} disabled={busy} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={input} /></label>
        </>}
      </div>
      {kind === "people" && !activeSites.length && <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">{t("ยังไม่มีไซต์ที่เปิดใช้งาน กรุณาเพิ่มไซต์ก่อน", "There are no active sites. Create a site before adding people.")} <button type="button" onClick={onOpenSites} className="underline">{t("ไปเพิ่มไซต์", "Go to sites")}</button></p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
      <p className="text-xs leading-6 text-slate-500">{t("ข้อมูลจะบันทึกจริงเมื่อกด Save เท่านั้น ไม่มีการเพิ่มข้อมูลตัวอย่างหรือส่งมอบโทรศัพท์อัตโนมัติ", "Save creates a real record. No sample people or sites are inserted and no phone is handed over automatically.")}</p>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setOpen(false); setError(null); }} disabled={busy} className="min-h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm">{t("ยกเลิก")}</button><button type="submit" disabled={busy || pending || (kind === "people" && !activeSites.length)} aria-busy={busy} className={button}>{busy && <LoadingIcon />}{busy ? t("กำลังบันทึก…") : t("บันทึก", "Save")}</button></div>
    </form>}
    {kind === "sites" ? <div className="space-y-3">{sites.length ? sites.map((site) => <article key={site.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-3"><MapPin className="text-blue-600" /><div><h2 className="font-semibold">{site.name}</h2><p className="mt-1 text-xs text-slate-500">{site.code} · {site.active ? t("เปิดใช้งาน", "Active") : t("ปิดใช้งาน", "Inactive")}</p></div></div><button type="button" disabled={busy || pending} onClick={() => onSiteView(site.id)} className="min-h-11 text-sm text-blue-600">{t("ดูเครื่องในไซต์", "View site inventory")}</button></article>) : <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">{t("ยังไม่มีไซต์ กรุณาเพิ่มไซต์เพื่อเริ่มต้น", "No sites yet. Add a site to get started.")}</p>}</div> : <>
      <div className="flex flex-wrap gap-3"><label className="relative flex-1"><span className="sr-only">{t("ค้นหาบุคลากร", "Search people")}</span><Search size={17} className="absolute top-3.5 left-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("ค้นหาชื่อหรือ FLS Employee ID", "Search name or FLS Employee ID")} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-10 text-base" /></label><select aria-label={t("ประเภทบุคลากร", "Person type")} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="all">{t("ทุกประเภท", "All people")}</option><option value="driver">Driver</option><option value="site_leader">Site Leader</option></select></div>
      <div className="space-y-3">{filteredPeople.length ? filteredPeople.map((person) => <article key={person.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5"><Users className="shrink-0 text-blue-600" /><div><h2 className="font-semibold">{person.name}</h2><p className="mt-1 text-xs leading-6 text-slate-500">{person.employeeNo} · {person.type === "driver" ? "Driver" : "Site Leader"} · {siteName(person.siteId)} · {person.active ? t("เปิดใช้งาน", "Active") : t("ปิดใช้งาน", "Inactive")}</p>{person.phone && <p className="text-xs text-slate-500">{person.phone}</p>}</div></article>) : <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">{t("ยังไม่มีบุคลากรที่ตรงกับขอบเขตหรือการค้นหา", "No people match this scope or search.")}</p>}</div>
    </>}
  </div>;
}
