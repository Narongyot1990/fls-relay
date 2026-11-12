"use client";

import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { WorkspaceScope } from "@/components/layout/WorkspaceScope";
import { ReceiptBell } from "@/components/layout/ReceiptBell";
import { FlsBrand } from "@/components/layout/FlsBrand";
import { useEffect, useRef, useState, useTransition } from "react";
import { Home, ArrowLeft } from "@/components/shared/BrandIcon";
import { WORKFLOW_ACTIONS, WORKFLOW_ROLES, type WorkflowActionId } from "@/lib/workflow-structure";
import type { InventoryItem, InventoryRole } from "@/lib/inventory";
import type { SiteSummary } from "@/lib/site-tracking";
import { SiteTrackingPanel } from "./SiteTrackingPanel";
import { InventoryToolbar } from "./InventoryToolbar";
import { useListView } from "./ListViewToggle";
import { InventoryList } from "./InventoryList";
import { InventoryImport } from "./InventoryImport";
import { ManualDeviceAdd } from "./ManualDeviceAdd";
import { RoleHome } from "./RoleHome";
import { HandoverReview } from "./HandoverReview";
import { TransferPanel } from "./TransferPanel";
import { ReturnPanel } from "./ReturnPanel";
import { ExchangePanel } from "./ExchangePanel";
import { HistoryPanel } from "./HistoryPanel";
import { useLanguage, LanguageSwitcher } from "@/components/shared/LanguageProvider";
import { canManageDirectory, type DirectoryPerson, type DirectorySite } from "@/lib/directory";
import { DirectoryPanel } from "./DirectoryPanel";
import { DeleteDeviceDialog } from "./DeleteDeviceDialog";
import { LoadingIcon } from "./LoadingIcon";

type Person = DirectoryPerson;
/** null = main menu (Level 1). "more" = secondary menu (Level 1.5). Any id = that section is open (Level 2/3). */
type Section = WorkflowActionId | "more" | null;
type Data = { siteSummaries?: SiteSummary[]; devices: InventoryItem[]; assignedDevices?: InventoryItem[]; sites: DirectorySite[]; holders: Person[]; leaders: Person[]; assignedSite: string | null };
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400";
const input = "mt-1.5 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-base";
const backButton = "flex min-h-11 items-center gap-2 text-sm text-slate-500";

export type WorkspaceStartProps = { initialSection?: "directory" | null; initialDirectoryTab?: "people" | "sites" };
export function InventoryWorkspace({ initialSection = null, initialDirectoryTab = "people" }: WorkspaceStartProps) {
  const { language, t } = useLanguage();
  const [role, setRole] = useState<InventoryRole>("implementation");
  const [site, setSite] = useState("all");
  const [leader, setLeader] = useState("");
  const [leaders, setLeaders] = useState<Person[]>([]);
  const [siteOptions, setSiteOptions] = useState<Data["sites"]>([]);
  const [historyDevice, setHistoryDevice] = useState<{ id: string; label: string } | null>(null);
  const [section, setSection] = useState<Section>(initialSection);
  const [directoryTab, setDirectoryTab] = useState<"people" | "sites">(initialDirectoryTab);
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
  const [inventorySort, setInventorySort] = useState("device");
  const [inventoryView, setInventoryView] = useListView("inventory");
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const mutation = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const canWrite = role === "implementation";
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
      if (role !== "site_leader") { setLeaders(result.leaders); setSiteOptions(result.sites); setLeader((current) => current && !result.leaders.some((person: Person) => person.id === current) ? "" : current); }
    }).catch((cause) => { if (!controller.signal.aborted) { setData(null); setError(cause instanceof Error ? cause.message : "Cannot connect to database"); setBusy(false); } });
    return () => controller.abort();
  }, [role, site, leader, version]);

  function reload() { setBusy(true); setError(null); setVersion((value) => value + 1); }
  function goSection(next: Section) {
    if (saving) return;
    setHistoryDevice(null);
    setPendingSection(next);
    startNavigation(() => {
      setSection(next); setEditing(null); setAdding(false); setDeleting(null); setDeleteError(null); setMessage(null);
      if (next === "directory") setDirectoryTab("people");
      if (next === "inventory") setReceiveTab("add");
    });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function changeProfile(next: InventoryRole, operator: string) {
    const nextLeader = next === "site_leader" ? operator : leader;
    if (next === role && (next !== "site_leader" || nextLeader === leader)) return;
    setLeader(nextLeader);
    setRole(next); setSite("all"); setSection(null); setEditing(null); setAdding(false); setDeleting(null); setDeleteError(null); setError(null); setMessage(null); setData(null); setQuery(""); setStatusFilter("all");
    setBusy(next !== "site_leader" || Boolean(nextLeader));
  }
  const siteName = (id: string | null) => id ? data?.sites.find((item) => item.id === id)?.name || siteOptions.find((item) => item.id === id)?.name || t("ไซต์ที่อ้างอิงไม่อยู่ในรายการ") : t("สต็อกส่วนกลาง · ยังไม่จัดสรรไซต์");
  const devices = data?.devices ?? [];
  const location = siteLeader ? data ? data.assignedSite ? siteName(data.assignedSite) : t("ยังไม่มีไซต์สังกัด", "No assigned site") : t("กำลังอ่านไซต์สังกัด…", "Loading assigned site…") : site === "all" ? t("ทุกไซต์", "All sites") : site === "central" ? t("สต็อกส่วนกลาง", "Central stock") : siteName(site);
  function changeSite(next: string) {
    if (next === site || saving || siteLeader) return;
    setSite(next); setData(null); setBusy(true); setEditing(null); setDeleting(null); setHistoryDevice(null); setMessage(null);
  }
  const listed = devices.filter((item) => (statusFilter === "all" || (statusFilter === "stock" ? ["registered", "in_site_stock"].includes(item.status) : item.status === statusFilter)) && `${item.deviceId} ${item.deviceName} ${item.model} ${item.serial} ${item.imei} ${item.phoneNumber} ${siteName(item.siteId)} ${data?.holders.find((person) => person.id === item.holderId)?.name || ""} ${data?.holders.find((person) => person.id === item.holderId)?.employeeNo || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const available = devices.filter((item) => item.status === "registered" || item.status === "in_site_stock").length;
  function openSitePhones(siteId: string, status: string) {
    goSection("inventory"); changeSite(siteId); setStatusFilter(status); setQuery("");
  }
  function openSiteHistory(siteId: string) { goSection("history"); changeSite(siteId); }


  async function save() {
    if (!editing || saving || mutation.current) return;
    mutation.current = true;
    setSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/inventory/${editing.id}`, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: editing.deviceId, deviceName: editing.deviceName, manufacturer: editing.manufacturer || "", model: editing.model, serial: editing.serial, imei: editing.imei, phoneNumber: editing.phoneNumber }) });
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto max-w-5xl space-y-2 sm:px-6">
        <div className="flex items-center justify-between gap-2"><button disabled={saving} onClick={() => goSection(null)} aria-label={t("กลับเมนูหลัก", "Back to menu")} className="flex min-w-0 items-center gap-3"><FlsBrand /></button><div className="flex shrink-0 items-center gap-2"><LanguageSwitcher />{siteLeader && <ReceiptBell devices={devices} headers={headers} disabled={saving || busy} onDone={() => { setMessage(t("ยืนยันรับเครื่องแล้ว", "Receipt confirmed.")); reload(); }} />}<ProfileMenu role={role} leader={leader} leaders={leaders} disabled={saving || (busy && !data && !error && !siteLeader)} onApply={changeProfile} /></div></div>
        {!(section === "inventory" && !adding && !editing) && <WorkspaceScope site={site} label={location} sites={siteOptions} locked={siteLeader} disabled={saving || busy} onChange={changeSite} />}
      </div>
    </header>
    <main aria-busy={busy || saving || isNavigating} className={`mx-auto max-w-5xl px-4 pb-20 sm:px-6 ${section === "inventory" && !adding && !editing ? "space-y-3 pt-3" : "space-y-6 py-7"}`}>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-700">{t(error)}<button onClick={reload} className="ml-3 underline">{t("ลองเชื่อมต่อใหม่")}</button></div>}
      {siteLeader && !leader && <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">{t("ยังไม่มี Site Leader ที่เลือกได้ กรุณาตรวจรายชื่อจริงผ่านบทบาทส่วนกลาง ไม่สร้างผู้ใช้ตัวอย่างอัตโนมัติ")}</p>}
      {(busy || isNavigating) && !error && !(siteLeader && !leader) && <div role="status" className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700"><LoadingIcon />{busy ? data ? t("กำลังอัปเดตข้อมูล…", "Updating records…") : t("กำลังอ่านข้อมูลจากฐานข้อมูล…") : t("กำลังเปิดหน้า…", "Opening view…")}</div>}

      {section === null && !(siteLeader && !leader) && <>
        <RoleHome role={role} view="primary" onAction={goSection} onMore={() => goSection("more")} pending={busy || saving || isNavigating} />
      </>}

      {section === "more" && !(siteLeader && !leader) && <section className="space-y-5">
        <button type="button" onClick={() => goSection(null)} className={backButton}><ArrowLeft size={16} />{t("กลับเมนูหลัก", "Back to menu")}</button>
        <h1 className="text-2xl font-semibold">{t("เมนูเพิ่มเติม", "More")}</h1>
        <RoleHome role={role} view="more" onAction={goSection} onMore={() => {}} pending={busy || saving || isNavigating} />
      </section>}

      {section === "inventory" && data && <section className="space-y-3">
        {(adding || editing) && <button type="button" onClick={() => goSection(null)} className={backButton} disabled={isNavigating && pendingSection === null}><ArrowLeft size={16} />{t("กลับเมนูหลัก", "Back to menu")}</button>}
        {adding ? <>
          <h1 className="text-2xl font-semibold">{t("รับเครื่องเข้าระบบ", "Receive devices")}</h1>
          <div className="flex gap-2">{(["add", "import"] as const).map((tab) => <button key={tab} type="button" onClick={() => setReceiveTab(tab)} className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm ${receiveTab === tab ? "bg-blue-600 font-medium text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{tab === "add" ? t("เพิ่มทีละเครื่อง", "Add one") : t("นำเข้าไฟล์", "Import file")}</button>)}</div>
          {receiveTab === "add" ? <ManualDeviceAdd headers={headers} onAdded={() => { setAdding(false); reload(); }} /> : <InventoryImport key={role} headers={headers} onImported={() => { setAdding(false); reload(); }} onBusyChange={setSaving} />}
        </> : editing ? <form onSubmit={(event) => { event.preventDefault(); save(); }} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5"><button type="button" onClick={() => setEditing(null)} disabled={saving} className={backButton}><ArrowLeft size={15} />{t("กลับรายการ")}</button><h2 className="text-lg font-semibold">{t("แก้ไขข้อมูลเครื่อง")}</h2><div className="grid gap-4 sm:grid-cols-2">{(["deviceId", "deviceName", "manufacturer", "model", "imei", "serial", "phoneNumber"] as const).map((field) => <label key={field} className="text-sm font-medium">{({ deviceId: "Device ID", deviceName: "Device name", manufacturer: t("ผู้ผลิต", "Manufacturer"), model: t("รุ่น"), imei: t("IMEI (ไม่บังคับ)"), serial: t("Serial (ไม่บังคับ)"), phoneNumber: t("เบอร์โทรศัพท์") })[field]}<input required={field === "deviceId"} aria-disabled={saving} maxLength={200} value={editing[field] || ""} disabled={saving} onChange={(event) => setEditing({ ...editing, [field]: event.target.value })} className={input} /></label>)}</div><button disabled={saving} aria-busy={saving} className={button}>{saving && <LoadingIcon />}{saving ? t("กำลังบันทึก…") : t("บันทึกลงฐานข้อมูลจริง")}</button></form> : <>
          <InventoryToolbar total={devices.length} matched={listed.length} stock={available} assigned={devices.filter((item) => item.status === "assigned").length}
            status={statusFilter} onStatus={setStatusFilter} query={query} onQuery={setQuery} sort={inventorySort} onSort={setInventorySort} view={inventoryView} onView={setInventoryView}
            pending={saving || busy} onBack={() => goSection(null)} onAdd={canWrite ? () => setAdding(true) : undefined}
            scope={<WorkspaceScope compact site={site} label={location} sites={siteOptions} locked={siteLeader} disabled={saving || busy} onChange={(id) => { changeSite(id); setQuery(""); }} summaries={data.siteSummaries || []} status={statusFilter} />} />
          {message && <p role="status" className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">{t(message)}</p>}
          {!listed.length && <p className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">{t("No records match your search and filters.")}</p>}
          <InventoryList view={inventoryView} sort={inventorySort} groupBySite={statusFilter === "assigned" && site === "all" && !siteLeader} devices={listed} people={data.holders} siteName={siteName} canWrite={canWrite} pending={saving || busy} onEdit={(item) => { setDeleting(null); setEditing(item); setMessage(null); window.scrollTo({ top: 0, behavior: "instant" }); }} onDelete={(item) => { setEditing(null); setDeleteError(null); setDeleting(item); setMessage(null); }} onHistory={(item) => { goSection("history"); setHistoryDevice({ id: item.id, label: item.deviceId }); }} />
        </>}
      </section>}

      {section === "site_tracking" && data && <section className="space-y-5"><button type="button" onClick={() => goSection(null)} className={backButton}><ArrowLeft size={16} />{t("กลับเมนูหลัก", "Back to menu")}</button><SiteTrackingPanel summaries={data.siteSummaries || []} selectedSite={siteLeader ? data.assignedSite || "all" : site} locked={siteLeader} pending={busy || saving} onSelectSite={changeSite} onPhones={openSitePhones} onHistory={openSiteHistory} onRefresh={reload} /></section>}

      {section === "directory" && data && <section className="space-y-5">
        <button type="button" onClick={() => goSection(null)} className={backButton} disabled={isNavigating && pendingSection === null}><ArrowLeft size={16} />{t("กลับเมนูหลัก", "Back to menu")}</button>
        <h1 className="text-2xl font-semibold">{WORKFLOW_ACTIONS.directory[language]}</h1>
        {message && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{t(message)}</p>}
        <div className="flex gap-2">{(["people", "sites"] as const).map((tab) => <button key={tab} type="button" disabled={saving} onClick={() => setDirectoryTab(tab)} className={`inline-flex min-h-10 items-center rounded-lg px-4 text-sm ${directoryTab === tab ? "bg-blue-600 font-medium text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{tab === "people" ? t("รายชื่อบุคลากร", "People") : t("ไซต์", "Sites")}</button>)}</div>
        <DirectoryPanel key={`${directoryTab}:${role}:${leader}`} kind={directoryTab} sites={data.sites} people={data.holders} canManage={manageDirectory} pending={busy} headers={headers} onBusyChange={setSaving} onChanged={(text) => { setMessage(text); reload(); }}
          onCreated={(created) => {
            setMessage(t("Record added."));
            if (site !== "all" && site !== created.siteId) { setSite(created.siteId); setData(null); setBusy(true); }
            else reload();
          }} onOpenSites={() => setDirectoryTab("sites")} onSiteView={(siteId) => { goSection("inventory"); if (!siteLeader && site !== siteId) { setSite(siteId); setData(null); setBusy(true); } }} />
      </section>}

      {section === "issue" && data && (siteLeader || role === "implementation") && <HandoverReview assignmentDevices={data.assignedDevices || devices} key={`${role}:${site}:${leader}`} devices={devices} holders={data.holders} central={!siteLeader} siteName={siteName} headers={headers} operatorName={siteLeader ? leaders.find((person) => person.id === leader)?.name : undefined} operatorRole={WORKFLOW_ROLES[role][language]} onBack={() => goSection(null)} onIssued={() => { reload(); goSection(null); }} />}

      {["transfer", "return", "exchange", "history"].includes(section ?? "") && data && <section className="space-y-5">
        <button type="button" onClick={() => goSection(null)} className={backButton}><ArrowLeft size={16} />{t("กลับเมนูหลัก", "Back to menu")}</button>
        <h1 className="text-2xl font-semibold">{WORKFLOW_ACTIONS[section as WorkflowActionId][language]}</h1>
        {message && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{t(message)}</p>}
        {section === "transfer" && <TransferPanel devices={devices} sites={data.sites} headers={headers} onDone={() => { setMessage(t("โอนเครื่องแล้ว", "Devices transferred.")); reload(); }} />}
        {section === "return" && <ReturnPanel key={`${role}:${site}:${leader}:${version}`} devices={devices} holders={data.holders} headers={headers} onDone={() => { setMessage(t("รับคืนเครื่องแล้ว", "Return recorded.")); reload(); }} />}
        {section === "exchange" && <ExchangePanel siteName={siteName} key={`${role}:${site}:${leader}:${version}`} devices={devices} holders={data.holders} headers={headers} onDone={() => { setMessage(t("เปลี่ยนเครื่องแล้ว", "Exchange recorded.")); reload(); }} />}
        {section === "history" && historyDevice && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800"><p>{t("ประวัติเครื่อง", "History for")} <strong>{historyDevice.label}</strong></p><button type="button" onClick={() => setHistoryDevice(null)} className="min-h-11 font-medium underline">{t("ดูทุกเครื่อง", "Show all phones")}</button></div>}
        {section === "history" && <HistoryPanel deviceId={historyDevice?.id} key={`${role}:${leader}:${site}:${historyDevice?.id || "all"}`} headers={headers} site={siteLeader ? "all" : site} />}
      </section>}

    </main>
    <footer className="border-t border-slate-200 bg-white p-5 text-center text-xs text-slate-400"><Home size={13} className="mr-1 inline" /> FLS Transport · Real inventory</footer>
    {deleting && <DeleteDeviceDialog device={deleting} busy={saving} error={deleteError} onCancel={() => { setDeleting(null); setDeleteError(null); }} onConfirm={remove} />}
  </div>;
}
