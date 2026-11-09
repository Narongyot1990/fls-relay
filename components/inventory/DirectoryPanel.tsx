"use client";

import { useRef, useState } from "react";
import { MapPin, Pencil, Plus, Search, Trash2, Users } from "@/components/shared/BrandIcon";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { DirectoryPerson, DirectorySite } from "@/lib/directory";
import { LoadingIcon } from "./LoadingIcon";

const input = "mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base disabled:bg-slate-50";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-50";
const emptyForm = { name: "", code: "", employeeNo: "", type: "driver", siteId: "", phone: "", active: true };

export function DirectoryPanel({ kind, sites, people, canManage, pending, headers, onBusyChange, onCreated, onChanged, onOpenSites, onSiteView }: {
  kind: "sites" | "people"; sites: DirectorySite[]; people: DirectoryPerson[]; canManage: boolean; pending: boolean;
  headers: Record<string, string>; onBusyChange: (busy: boolean) => void;
  onCreated: (result: { kind: "sites" | "people"; siteId: string }) => void; onChanged: (message: string) => void;
  onOpenSites: () => void; onSiteView: (siteId: string) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState(emptyForm);
  const activeSites = sites.filter((site) => site.active || (editing && site.id === form.siteId));
  const siteName = (id: string) => sites.find((site) => site.id === id)?.name || "—";
  const formTitle = kind === "sites" ? editing ? t("แก้ไขไซต์", "Edit site") : t("เพิ่มไซต์", "Add site") : editing ? t("แก้ไขบุคลากร", "Edit person") : t("เพิ่มบุคลากร", "Add person");
  function edit(record: DirectorySite | DirectoryPerson, active = record.active) {
    setForm({ ...emptyForm, ...record, code: "code" in record ? record.code : "", employeeNo: "employeeNo" in record ? record.employeeNo : "", type: "type" in record ? record.type : "driver", siteId: "siteId" in record ? record.siteId : "", phone: "phone" in record ? record.phone || "" : "", active });
    setEditing(record.id); setOpen(true); setError(null); window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function submit() {
    if (inFlight.current || busy || pending) return;
    inFlight.current = true; setBusy(true); onBusyChange(true); setError(null);
    try {
      const response = await fetch(`/api/inventory/${kind}${editing ? `/${editing}` : ""}`, { method: editing ? "PATCH" : "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(kind === "sites" ? { code: form.code, name: form.name, ...(editing ? { active: form.active } : {}) } : { name: form.name, employeeNo: form.employeeNo, type: form.type, siteId: form.siteId, phone: form.phone, ...(editing ? { active: form.active } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this record");
      setOpen(false); setForm(emptyForm);
      if (editing) onChanged(t("บันทึกการแก้ไขแล้ว", "Record updated."));
      else onCreated({ kind, siteId: kind === "sites" ? data.site.id : data.person.siteId });
      setEditing(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save this record"); }
    finally { inFlight.current = false; setBusy(false); onBusyChange(false); }
  }
  async function remove() {
    if (!deleting || inFlight.current || busy || pending) return;
    inFlight.current = true; setBusy(true); onBusyChange(true); setError(null);
    try {
      const response = await fetch(`/api/inventory/${kind}/${deleting.id}`, { method: "DELETE", headers });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete this record");
      setDeleting(null); onChanged(t("ลบรายการที่ยังไม่ใช้งานแล้ว", "Unused record deleted."));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete this record"); }
    finally { inFlight.current = false; setBusy(false); onBusyChange(false); }
  }
  const records = (kind === "sites" ? sites : people).filter((record) => (statusFilter === "all" || record.active === (statusFilter === "active")) &&
    (kind === "sites" || typeFilter === "all" || ("type" in record && record.type === typeFilter)) &&
    `${record.name} ${"code" in record ? record.code : `${record.employeeNo} ${siteName(record.siteId)}`}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const allRecords = kind === "sites" ? sites : people;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm leading-6 text-slate-500">{kind === "sites" ? t("จัดการชื่อ รหัส และสถานะไซต์ แล้วเปิดดูโทรศัพท์ประจำไซต์ได้", "Manage site names, codes and status, then track each site's phones.") : t("จัดการรายชื่อ สังกัด และสถานะ Driver / Site Leader", "Manage Driver and Site Leader identities, affiliation and status.")}</p><p className="mt-2 text-xs text-slate-400">{t(`${allRecords.length} รายการ · เปิดใช้งาน ${allRecords.filter((record) => record.active).length} · ปิดใช้งาน ${allRecords.filter((record) => !record.active).length}`, `${allRecords.length} records · ${allRecords.filter((record) => record.active).length} active · ${allRecords.filter((record) => !record.active).length} inactive`)}</p></div>{canManage && <button type="button" disabled={busy || pending} onClick={() => { setOpen(true); setEditing(null); setForm(emptyForm); setError(null); }} className={button}><Plus size={17} />{kind === "sites" ? t("เพิ่มไซต์", "Add site") : t("เพิ่มบุคลากร", "Add person")}</button>}</div>
    {open && canManage && <form aria-label={formTitle} onSubmit={(event) => { event.preventDefault(); submit(); }} aria-busy={busy} className="space-y-5 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">{formTitle}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">{kind === "sites" ? t("ชื่อไซต์", "Site name") : t("ชื่อ-นามสกุล", "Full name")}<input required maxLength={120} value={form.name} disabled={busy} onChange={(event) => setForm({ ...form, name: event.target.value })} className={input} /></label>
        {kind === "sites" ? <label className="text-sm font-medium">{t("รหัสไซต์", "Site code")}<input aria-label={t("Site code")} required minLength={2} maxLength={24} pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,23}" value={form.code} disabled={busy} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} className={input} /><span className="mt-2 block text-xs font-normal text-slate-400">{t("รหัส 2–24 ตัว: ตัวอักษรอังกฤษ ตัวเลข - หรือ _", "2–24 characters: letters, numbers, - or _.")}</span></label> : <>
          <label className="text-sm font-medium">FLS Employee ID<input required maxLength={64} value={form.employeeNo} disabled={busy} onChange={(event) => setForm({ ...form, employeeNo: event.target.value })} className={input} /></label>
          <label className="text-sm font-medium">{t("ประเภทบุคลากร", "Person type")}<select aria-label={t("Person type")} value={form.type} disabled={busy} onChange={(event) => setForm({ ...form, type: event.target.value })} className={input}><option value="driver">Driver</option><option value="site_leader">Site Leader</option></select></label>
          <label className="text-sm font-medium">{t("ไซต์สังกัด", "Assigned site")}<select aria-label={t("Assigned site")} required value={form.siteId} disabled={busy || !activeSites.length} onChange={(event) => setForm({ ...form, siteId: event.target.value })} className={input}><option value="">{t("เลือกไซต์", "Select a site")}</option>{activeSites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.code}{!site.active ? ` (${t("ปิดใช้งาน", "Inactive")})` : ""}</option>)}</select></label>
          <label className="text-sm font-medium">{t("เบอร์โทรศัพท์ (ไม่บังคับ)", "Phone number (optional)")}<input type="tel" maxLength={40} value={form.phone} disabled={busy} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={input} /></label>
        </>}
      </div>
      {editing && <label className="flex min-h-11 items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm"><input type="checkbox" checked={form.active} disabled={busy} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-5 w-5 accent-blue-600" />{t("เปิดใช้งานรายการนี้", "Active record")}</label>}
      {kind === "people" && !activeSites.length && <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">{t("ยังไม่มีไซต์ที่เปิดใช้งาน กรุณาเพิ่มไซต์ก่อน", "There are no active sites. Create a site before adding people.")} <button type="button" onClick={onOpenSites} className="underline">{t("ไปเพิ่มไซต์", "Go to sites")}</button></p>}
      {error && !deleting && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{t(error)}</p>}
      <p className="text-xs leading-6 text-slate-500">{editing ? t("ปิดใช้งานเพื่อเก็บประวัติไว้ หากยังถือโทรศัพท์อยู่ ให้รับคืนก่อนย้ายไซต์หรือปิดใช้งาน", "Deactivate to preserve history. Return assigned phones before changing affiliation or deactivating a person.") : t("ข้อมูลจะบันทึกจริงเมื่อกด Save เท่านั้น", "Save creates a real record.")}</p>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setOpen(false); setError(null); setEditing(null); }} disabled={busy} className="min-h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm">{t("ยกเลิก", "Cancel")}</button><button type="submit" disabled={busy || pending || (kind === "people" && !activeSites.length)} aria-busy={busy} className={button}>{busy && <LoadingIcon />}{busy ? t("กำลังบันทึก…", "Saving…") : t("บันทึก", "Save")}</button></div>
    </form>}
    <div className="flex flex-wrap gap-3"><label className="relative min-w-48 flex-1"><span className="sr-only">{kind === "sites" ? t("ค้นหาไซต์", "Search sites") : t("ค้นหาบุคลากร", "Search people")}</span><Search size={17} className="absolute top-3.5 left-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={kind === "sites" ? t("ค้นหาชื่อหรือรหัสไซต์", "Search site name or code") : t("ค้นหาชื่อ รหัสพนักงาน หรือไซต์", "Search name, employee ID or site")} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-10 text-base" /></label>{kind === "people" && <select aria-label={t("ประเภทบุคลากร", "Person type")} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="all">{t("ทุกประเภท", "All people")}</option><option value="driver">Driver</option><option value="site_leader">Site Leader</option></select>}<select aria-label={t("สถานะรายการ", "Record status")} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="all">{t("ทุกสถานะ", "All statuses")}</option><option value="active">{t("เปิดใช้งาน", "Active")}</option><option value="inactive">{t("ปิดใช้งาน", "Inactive")}</option></select></div>
    <div className="grid gap-4 md:grid-cols-2">{records.map((record) => <article key={record.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 p-5"><span className="rounded-xl bg-blue-50 p-2">{kind === "sites" ? <MapPin size={27} /> : <Users size={27} />}</span><div className="min-w-0 flex-1"><h2 className="break-words text-base font-semibold">{record.name}</h2><p className="mt-1 font-mono text-xs text-slate-500">{"code" in record ? record.code : record.employeeNo}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${record.active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{record.active ? t("เปิดใช้งาน", "Active") : t("ปิดใช้งาน", "Inactive")}</span></div>
      {"siteId" in record && <dl className="mx-5 mb-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm"><div><dt className="text-xs text-slate-500">{t("หน้าที่", "Role")}</dt><dd className="mt-1 font-medium">{record.type === "driver" ? "Driver" : "Site Leader"}</dd></div><div><dt className="text-xs text-slate-500">{t("ไซต์สังกัด", "Assigned site")}</dt><dd className="mt-1 break-words font-medium">{siteName(record.siteId)}</dd></div><div className="col-span-2"><dt className="text-xs text-slate-500">{t("เบอร์ติดต่อ", "Contact")}</dt><dd className="mt-1">{record.phone || "—"}</dd></div></dl>}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 bg-slate-50/50 px-5 py-2">{kind === "sites" && <button type="button" disabled={busy || pending} onClick={() => onSiteView(record.id)} className="min-h-11 text-sm font-medium text-blue-700">{t("ดูเครื่องในไซต์", "View site inventory")}</button>}{canManage && <><button type="button" disabled={busy || pending} onClick={() => edit(record)} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-700"><Pencil size={16} />{t("แก้ไข", "Edit")}</button><button type="button" disabled={busy || pending} onClick={() => edit(record, !record.active)} className="min-h-11 text-sm text-slate-600">{record.active ? t("ปิดใช้งาน", "Deactivate") : t("เปิดใช้งานอีกครั้ง", "Reactivate")}</button><button type="button" disabled={busy || pending} onClick={() => { setDeleting({ id: record.id, name: record.name }); setError(null); }} className="inline-flex min-h-11 items-center gap-2 text-sm text-red-700"><Trash2 size={16} />{t("ลบ", "Delete")}</button></>}</div>
    </article>)}</div>
    {!records.length && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">{kind === "sites" && !sites.length ? t("ยังไม่มีไซต์ กรุณาเพิ่มไซต์เพื่อเริ่มต้น", "No sites yet. Add a site to get started.") : t("ไม่มีรายการที่ตรงกับการค้นหาและตัวกรอง", "No records match your search and filters.")}</p>}
    {deleting && <Dialog open onOpenChange={(value) => { if (!value && !busy) { setDeleting(null); setError(null); } }}><DialogContent showCloseButton={!busy} className="bg-white"><DialogTitle>{t(`ลบ ${deleting.name}?`, `Delete ${deleting.name}?`)}</DialogTitle><DialogDescription>{t("ลบถาวรได้เฉพาะรายการที่ไม่มีเครื่อง คน หรือประวัติอ้างอิง หากเคยใช้งาน ให้เลือกปิดใช้งานเพื่อเก็บประวัติ", "Only unused records without device, people or history references can be permanently deleted. Deactivate used records to preserve tracking.")}</DialogDescription>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700">{t(error)}</p>}<div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={busy} onClick={() => { setDeleting(null); setError(null); }} className="min-h-11 rounded-lg border px-4 text-sm">{t("ยกเลิก", "Cancel")}</button><button type="button" disabled={busy || pending} aria-busy={busy} onClick={remove} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white">{busy && <LoadingIcon />}{busy ? t("กำลังลบ…", "Deleting…") : t("ยืนยันลบ", "Confirm deletion")}</button></div></DialogContent></Dialog>}
  </div>;
}
