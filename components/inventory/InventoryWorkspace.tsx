"use client";

import { FlsBrand } from "@/components/layout/FlsBrand";
import { useEffect, useRef, useState, useTransition } from "react";
import { Home, Search, MapPin, ArrowLeft, Pencil, Trash2, Plus } from "@/components/shared/BrandIcon";
import { WORKFLOW_ACTIONS, WORKFLOW_ROLES, type WorkflowActionId } from "@/lib/workflow-structure";
import type { InventoryItem, InventoryRole } from "@/lib/inventory";
import { InventoryImport } from "./InventoryImport";
import { ManualDeviceAdd } from "./ManualDeviceAdd";
import { RoleHome } from "./RoleHome";
import { HandoverReview } from "./HandoverReview";
import { TransferPanel } from "./TransferPanel";
import { ReceiptPanel } from "./ReceiptPanel";
import { ReturnPanel } from "./ReturnPanel";
import { ExchangePanel } from "./ExchangePanel";
import { HistoryPanel } from "./HistoryPanel";
import { useLanguage, LanguageSwitcher } from "@/components/shared/LanguageProvider";
import { canManageDirectory, type DirectoryPerson, type DirectorySite } from "@/lib/directory";
import { DirectoryPanel } from "./DirectoryPanel";
import { DeleteDeviceDialog } from "./DeleteDeviceDialog";
import { LoadingIcon } from "./LoadingIcon";

type Person = DirectoryPerson;
/** null = main menu (Level 1). Any id = that section is open (Level 2/3). */
type Section = WorkflowActionId | null;
type Data = { devices: InventoryItem[]; assignedDevices?: InventoryItem[]; sites: DirectorySite[]; holders: Person[]; leaders: Person[]; assignedSite: string | null };
const roles: InventoryRole[] = ["it", "implementation", "site_leader", "system_admin"];
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400";
const input = "mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base";
const backButton = "flex min-h-11 items-center gap-2 text-sm text-slate-500";

export function InventoryWorkspace() {
  const { language, t } = useLanguage();
  const [role, setRole] = useState<InventoryRole>("it");
  const [site, setSite] = useState("all");
  const [leader, setLeader] = useState("");
  const [leaders, setLeaders] = useState<Person[]>([]);
  const [siteOptions, setSiteOptions] = useState<Data["sites"]>([]);
  const [section, setSection] = useState<Section>(null);
  const [directoryTab, setDirectoryTab] = useState<"people" | "sites">("people");
  const [adding, setAdding] = useState(false);
  const [receiveTab, setReceiveTab] = useState<"add" | "import">("add");
  const [isNavigating, startNavigation] = useTransition();
  const [pendingSection, setPendingSection] = useState<Section>(null);
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mutation = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const canWrite = role === "it" || role === "implementation";
  const siteLeader = role === "site_leader";
  const manageDirectory = canManageDirectory(role);
  const headers: Record<string, string> = { "X-Inventory-Role": role, ...(leader ? { "X-Inventory-Leader": leader } : {}) };

  useEffect(() => {
    const controller = new AbortController();
    if (role === "site_leader" && !leader) return;
    fetch(`/api/inventory?site=${role === "site_leader" ? "all" : encodeURIComponent(site)}`, {
      headers: { "X-Inventory-Role": role, ...(leader ? { "X-Inventory-Leader": leader } : {}) }, signal: controller.signal, cache: "no-store",
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cannot load inventory");
      if (controller.signal.aborted) return;
      setData(result); setError(null); setBusy(false);
      if (role !== "site_leader") { setLeaders(result.leaders); setSiteOptions(result.sites); }
    }).catch((cause) => { if (!controller.signal.aborted) { setData(null); setError(cause instanceof Error ? cause.message : "Cannot connect to database"); setBusy(false); } });
    return () => controller.abort();
  }, [role, site, leader, version]);

  function reload() { setBusy(true); setError(null); setVersion((value) => value + 1); }
  function goSection(next: Section) {
    if (saving) return;
    setPendingSection(next);
    startNavigation(() => {
      setSection(next); setEditing(null); setAdding(false); setDeleting(null); setDeleteError(null); setMessage(null);
      if (next === "directory") setDirectoryTab("people");
      if (next === "inventory") setReceiveTab("add");
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function changeRole(next: InventoryRole) {
    if (next === role) return;
    setRole(next); setSite("all"); setSection(null); setEditing(null); setAdding(false); setDeleting(null); setDeleteError(null); setError(null); setMessage(null); setData(null); setQuery(""); setStatusFilter("all");
    if (next === "site_leader" && !leader && leaders.length) setLeader(leaders[0].id);
    setBusy(next !== "site_leader" || Boolean(leader || leaders.length));
  }
  const siteName = (id: string | null) => id ? data?.sites.find((item) => item.id === id)?.name || t("ไซต์ที่อ้างอิงไม่อยู่ในรายการ") : t("สต็อกส่วนกลาง · ยังไม่จัดสรรไซต์");
  const devices = data?.devices ?? [];
  const location = siteLeader ? siteName(data?.assignedSite || null) : site === "all" ? t("ภาพรวมทุกไซต์") : site === "central" ? siteName(null) : siteName(site);
  const listed = devices.filter((item) => (statusFilter === "all" || (statusFilter === "stock" ? ["registered", "in_site_stock"].includes(item.status) : item.status === statusFilter)) && `${item.deviceId} ${item.deviceName} ${item.model} ${item.serial} ${item.imei} ${item.phoneNumber}`.toLowerCase().includes(query.toLowerCase()));
  const available = devices.filter((item) => item.status === "registered" || item.status === "in_site_stock").length;

  async function save() {
    if (!editing || saving || mutation.current) return;
    mutation.current = true;
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/inventory/${editing.id}`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: editing.deviceId, deviceName: editing.deviceName, model: editing.model, serial: editing.serial, imei: editing.imei, phoneNumber: editing.phoneNumber }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cannot save device");
      setEditing(null); setMessage(t("บันทึกข้อมูลจริงแล้ว")); reload();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Cannot save"); }
    finally { setSaving(false); mutation.current = false; }
  }
  async function remove() {
    if (!deleting || saving || mutation.current) return;
    mutation.current = true;
    setSaving(true); setDeleteError(null);
    try {
      const response = await fetch(`/api/inventory/${deleting.id}`, { method: "DELETE", headers });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Cannot delete device");
      setDeleting(null); setMessage(t("ลบรายการที่ยังไม่เคยใช้งานแล้ว")); reload();
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : "Cannot delete"); }
    finally { setSaving(false); mutation.current = false; }
  }

  return <div lang={language} className="min-h-screen bg-[#f8fafc] text-slate-900 [font-family:Arial,'Tahoma',sans-serif]">
    <header className="border-b border-slate-200 bg-white px-4 py-4"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3"><button disabled={saving} onClick={() => goSection(null)} aria-label={t("กลับเมนูหลัก", "Back to menu")} className="flex items-center gap-3"><FlsBrand /></button><div className="flex items-center gap-2"><LanguageSwitcher /></div></div></header>
    <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-center text-xs leading-6 text-amber-900">{t("Public testing uses real data. Anyone can switch roles and test inventory. Imports save only after confirmation.")}</div>
    <div className="border-b border-slate-200 bg-white px-4 py-3"><div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3">
      <label className="text-sm">{t("บทบาท")}<select aria-label={t("Role")} value={role} disabled={saving || (busy && !data && !error && role !== "site_leader")} onChange={(event) => changeRole(event.target.value as InventoryRole)} className="ml-2 min-h-11 rounded-lg border border-slate-200 px-3 text-blue-700">{roles.map((item) => <option key={item} value={item}>{WORKFLOW_ROLES[item][language]}</option>)}</select></label>
      {siteLeader ? <label className="text-sm">{t("ผู้ใช้จริง")}<select aria-label={t("Operator")} value={leader} disabled={saving} onChange={(event) => { if (event.target.value === leader) return; setLeader(event.target.value); setData(null); setBusy(Boolean(event.target.value)); setEditing(null); }} className="ml-2 min-h-11 rounded-lg border border-slate-200 px-3"><option value="">{t("เลือก Site Leader")}</option>{leaders.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <label className="text-sm">{t("ดูข้อมูล")}<select aria-label={t("View")} value={site} disabled={saving} onChange={(event) => { if (event.target.value === site) return; setSite(event.target.value); setData(null); setBusy(true); setEditing(null); setDeleting(null); }} className="ml-2 min-h-11 max-w-72 rounded-lg border border-slate-200 px-3"><option value="all">{t("ทุกไซต์ · ภาพรวม")}</option>{siteOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}<option value="central">{t("สต็อกส่วนกลาง · ยังไม่จัดสรรไซต์")}</option></select></label>}
    </div></div>
    <main aria-busy={busy || saving || isNavigating} className="mx-auto max-w-5xl space-y-6 px-4 py-7 pb-20 sm:px-6">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">{t(error)}<button onClick={reload} className="ml-3 underline">{t("ลองเชื่อมต่อใหม่")}</button></div>}
      {siteLeader && !leader && <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">{t("ยังไม่มี Site Leader ที่เลือกได้ กรุณาตรวจรายชื่อจริงผ่านบทบาทส่วนกลาง ไม่สร้างผู้ใช้ตัวอย่างอัตโนมัติ")}</p>}
      {(busy || isNavigating) && !error && !(siteLeader && !leader) && <div role="status" className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700"><LoadingIcon />{busy ? data ? t("กำลังอัปเดตข้อมูล…", "Updating records…") : t("กำลังอ่านข้อมูลจากฐานข้อมูล…") : t("กำลังเปิดหน้า…", "Opening view…")}</div>}

      {section === null && !(siteLeader && !leader) && <>
        <p className="flex items-center gap-2 text-xs text-slate-500"><MapPin size={14} />{location}</p>
        <RoleHome role={role} onAction={goSection} pending={busy || saving || isNavigating} />
      </>}

      {section === "inventory" && data && <section className="space-y-5">
        <button type="button" onClick={() => goSection(null)} className={backButton} disabled={isNavigating && pendingSection === null}><ArrowLeft size={16} />{t("กลับเมนูหลัก", "Back to menu")}</button>
        {adding ? <>
          <h1 className="text-2xl font-semibold">{t("รับเครื่องเข้าระบบ", "Receive devices")}</h1>
          <div className="flex gap-2">{(["add", "import"] as const).map((tab) => <button key={tab} type="button" onClick={() => setReceiveTab(tab)} className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm ${receiveTab === tab ? "bg-blue-600 font-medium text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{tab === "add" ? t("เพิ่มทีละเครื่อง", "Add one") : t("นำเข้าไฟล์", "Import file")}</button>)}</div>
          {receiveTab === "add" ? <ManualDeviceAdd headers={headers} onAdded={() => { setAdding(false); reload(); }} /> : <InventoryImport key={role} headers={headers} onImported={() => { setAdding(false); reload(); }} onBusyChange={setSaving} />}
        </> : editing ? <form onSubmit={(event) => { event.preventDefault(); save(); }} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"><button type="button" onClick={() => setEditing(null)} disabled={saving} className={backButton}><ArrowLeft size={15} />{t("กลับรายการ")}</button><h2 className="text-lg font-semibold">{t("แก้ไขข้อมูลเครื่อง")}</h2><div className="grid gap-4 sm:grid-cols-2">{(["deviceId", "deviceName", "model", "imei", "serial", "phoneNumber"] as const).map((field) => <label key={field} className="text-sm font-medium">{({ deviceId: "Device ID", deviceName: "Device name", model: t("รุ่น"), imei: t("IMEI (ไม่บังคับ)"), serial: t("Serial (ไม่บังคับ)"), phoneNumber: t("เบอร์โทรศัพท์") })[field]}<input required={field === "deviceId"} aria-disabled={saving} maxLength={200} value={editing[field]} disabled={saving} onChange={(event) => setEditing({ ...editing, [field]: event.target.value })} className={input} /></label>)}</div><button disabled={saving} aria-busy={saving} className={button}>{saving && <LoadingIcon />}{saving ? t("กำลังบันทึก…") : t("บันทึกลงฐานข้อมูลจริง")}</button></form> : <>
          <div><h1 className="text-2xl font-semibold">{t("รายการเครื่องในระบบ")}</h1></div>
          <div className="grid grid-cols-3 gap-3">{[["all", t("ทั้งหมด", "Total"), devices.length], ["stock", t("อยู่ในสต็อก", "In stock"), available], ["assigned", t("จ่ายแล้ว", "Assigned"), devices.filter((item) => item.status === "assigned").length]].map(([id, label, value]) => <button type="button" key={id} aria-pressed={statusFilter === id} onClick={() => setStatusFilter(String(id))} className={`rounded-xl border p-4 text-left ${statusFilter === id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-slate-200 bg-white"}`}><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></button>)}</div>
          <p role="status" className="text-sm text-slate-500">{t(`แสดง ${listed.length} จาก ${devices.length} เครื่อง`, `Showing ${listed.length} of ${devices.length} devices`)}</p>
          {message && <p role="status" className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">{t(message)}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative block flex-1"><span className="sr-only">{t("ค้นหาเครื่อง")}</span><Search size={18} className="absolute top-3.5 left-3 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("ค้นหา Device ID, Device name, Serial, IMEI")} className="min-h-12 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-10 text-base" /></label>
            {canWrite && <button type="button" onClick={() => setAdding(true)} className={button}><Plus size={16} />{t("เพิ่มเครื่อง", "Add")}</button>}
          </div>
          {!listed.length && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{t("ไม่พบข้อมูลในขอบเขตนี้ ")}{canWrite && t("กด เพิ่มเครื่อง เพื่อรับเครื่องเข้าสต็อก", "Use Add to receive devices into stock.")}</p>}
          <div className="space-y-3">{listed.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="break-all font-semibold text-blue-700">{item.deviceId}</h2><p className="mt-1 text-sm text-slate-500">{item.deviceName || item.model || t("ยังไม่ระบุชื่อ/รุ่น")}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{item.status === "registered" && !item.siteId ? t("สต็อกส่วนกลาง · ยังไม่จัดสรร") : item.status}</span></div><dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">{([[t("ไซต์"), siteName(item.siteId)], item.imei ? ["IMEI", item.imei] : null, item.serial ? ["Serial", item.serial] : null, item.phoneNumber ? [t("เบอร์โทร"), item.phoneNumber] : null, item.mdm.managedBy ? ["Managed by", item.mdm.managedBy] : null, item.mdm.complianceState ? ["Compliance", item.mdm.complianceState] : null, item.mdm.lastCheckInAt ? ["Last check-in", item.mdm.lastCheckInAt] : null] as ([string, string] | null)[]).filter((entry): entry is [string, string] => entry !== null).map(([label, value]) => <div key={label}><dt className="text-slate-400">{label}</dt><dd className="mt-1 break-all text-slate-600">{value}</dd></div>)}</dl>{canWrite && <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3"><button disabled={saving || busy} onClick={() => { setDeleting(null); setDeleteError(null); setEditing(item); setMessage(null); window.scrollTo({ top: 0, behavior: "instant" }); }} className="flex min-h-11 items-center gap-2 text-sm text-blue-600"><Pencil size={15} />{t("แก้ไข")}</button>{item.status === "registered" && !item.siteId && !item.holderId && <button disabled={saving || busy} onClick={() => { setEditing(null); setDeleteError(null); setDeleting(item); setMessage(null); }} className="flex min-h-11 items-center gap-2 text-sm text-red-600"><Trash2 size={15} />{t("ลบรายการที่ยังไม่ใช้งาน")}</button>}</div>}</article>)}</div>
        </>}
      </section>}

      {section === "directory" && data && <section className="space-y-5">
        <button type="button" onClick={() => goSection(null)} className={backButton} disabled={isNavigating && pendingSection === null}><ArrowLeft size={16} />{t("กลับเมนูหลัก", "Back to menu")}</button>
        <h1 className="text-2xl font-semibold">{t("ทำเนียบบุคลากรและไซต์", "Directory")}</h1>
        {message && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{t(message)}</p>}
        <div className="flex gap-2">{(["people", "sites"] as const).map((tab) => <button key={tab} type="button" onClick={() => setDirectoryTab(tab)} className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm ${directoryTab === tab ? "bg-blue-600 font-medium text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{tab === "people" ? t("รายชื่อบุคลากร", "People") : t("ไซต์", "Sites")}</button>)}</div>
        <DirectoryPanel key={`${directoryTab}:${role}:${leader}`} kind={directoryTab} sites={data.sites} people={data.holders} canManage={manageDirectory} pending={busy} headers={headers} onBusyChange={setSaving}
          onCreated={(created) => {
            setMessage(t("Record added."));
            if (site !== "all" && site !== created.siteId) { setSite(created.siteId); setData(null); setBusy(true); }
            else reload();
          }} onOpenSites={() => setDirectoryTab("sites")} onSiteView={(siteId) => { goSection("inventory"); if (!siteLeader && site !== siteId) { setSite(siteId); setData(null); setBusy(true); } }} />
      </section>}

      {section === "issue" && data && (siteLeader || role === "implementation") && <HandoverReview assignmentDevices={data.assignedDevices || devices} key={`${role}:${site}:${leader}`} devices={devices} holders={data.holders} central={!siteLeader} siteName={siteName} headers={headers} operatorName={siteLeader ? leaders.find((person) => person.id === leader)?.name : undefined} operatorRole={WORKFLOW_ROLES[role][language]} onBack={() => goSection(null)} onIssued={() => { reload(); goSection(null); }} />}

      {["transfer", "receipt", "return", "exchange", "history"].includes(section ?? "") && data && <section className="space-y-5">
        <button type="button" onClick={() => goSection(null)} className={backButton}><ArrowLeft size={16} />{t("กลับเมนูหลัก", "Back to menu")}</button>
        <h1 className="text-2xl font-semibold">{WORKFLOW_ACTIONS[section as WorkflowActionId][language]}</h1>
        {message && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{t(message)}</p>}
        {section === "transfer" && <TransferPanel devices={devices} sites={data.sites} headers={headers} onDone={() => { setMessage(t("โอนเครื่องแล้ว", "Devices transferred.")); reload(); }} />}
        {section === "receipt" && <ReceiptPanel devices={devices} headers={headers} onDone={() => { setMessage(t("ยืนยันรับเครื่องแล้ว", "Receipt confirmed.")); reload(); }} />}
        {section === "return" && <ReturnPanel key={`${role}:${site}:${leader}:${version}`} devices={devices} holders={data.holders} headers={headers} onDone={() => { setMessage(t("รับคืนเครื่องแล้ว", "Return recorded.")); reload(); }} />}
        {section === "exchange" && <ExchangePanel siteName={siteName} key={`${role}:${site}:${leader}:${version}`} devices={devices} holders={data.holders} headers={headers} onDone={() => { setMessage(t("เปลี่ยนเครื่องแล้ว", "Exchange recorded.")); reload(); }} />}
        {section === "history" && <HistoryPanel key={`${role}:${leader}:${site}`} headers={headers} site={siteLeader ? "all" : site} />}
      </section>}

      {section !== null && !["inventory", "directory", "issue", "transfer", "receipt", "return", "exchange", "history"].includes(section) && <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <button type="button" onClick={() => goSection(null)} className={backButton}><ArrowLeft size={16} />{t("กลับเมนูหลัก", "Back to menu")}</button>
        <p className="text-xs text-blue-600">{WORKFLOW_ROLES[role][language]} · {location}</p><h1 className="text-2xl font-semibold">{WORKFLOW_ACTIONS[section][language]}</h1><p className="text-sm leading-7 text-slate-600">{t(WORKFLOW_ACTIONS[section].detail)}</p>
        <p className="rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-800">{t("โครงหน้าสำหรับรีวิว ยังไม่เปิดบันทึกรายการในส่วนนี้ ข้อมูลจริงและ Import ยังคงใช้งานผ่านเมนูเดิมได้")}</p>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => goSection("inventory")} className={button}>{t("ดูรายการเครื่องจริง")}</button>{section === "users" && <button type="button" onClick={() => goSection("directory")} className={button}>{t("ดูรายชื่อบุคลากรจริง")}</button>}</div>
      </section>}
    </main>
    <footer className="border-t border-slate-200 bg-white p-5 text-center text-xs text-slate-400"><Home size={13} className="mr-1 inline" /> FLS Transport · Real inventory</footer>
    {deleting && <DeleteDeviceDialog device={deleting} busy={saving} error={deleteError} onCancel={() => { setDeleting(null); setDeleteError(null); }} onConfirm={remove} />}
  </div>;
}
