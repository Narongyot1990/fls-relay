"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, ChevronRight } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { WORKFLOW_ROLES } from "@/lib/workflow-structure";
import type { InventoryRole } from "@/lib/inventory";
import type { DirectoryPerson } from "@/lib/directory";

const roles: InventoryRole[] = ["implementation", "site_leader"];
const initials: Record<InventoryRole, string> = { implementation: "IM", site_leader: "SL" };

export function ProfileMenu({ role, leader, leaders, disabled, onApply }: {
  role: InventoryRole; leader: string; leaders: DirectoryPerson[]; disabled: boolean;
  onApply: (role: InventoryRole, leader: string) => void;
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const operator = role === "site_leader" ? leaders.find((person) => person.id === leader) : null;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<button type="button" aria-label={t("โปรไฟล์", "Profile")} disabled={disabled} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white p-1.5 transition hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-50 sm:rounded-xl sm:pr-3" />}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[#006cb3]">{initials[role]}</span>
      <span className="hidden max-w-40 text-left sm:block"><span className="block text-[10px] leading-4 text-slate-400">{t("โปรไฟล์", "Profile")}</span><strong className="block truncate text-xs font-semibold text-slate-700">{operator?.name || WORKFLOW_ROLES[role][language]}</strong></span>
      <ChevronRight size={13} className="rotate-90" />
    </DialogTrigger>
    {open && <ProfileForm role={role} leader={leader} leaders={leaders} onCancel={() => setOpen(false)} onApply={(nextRole, nextLeader) => { setOpen(false); onApply(nextRole, nextLeader); }} />}
  </Dialog>;
}

function ProfileForm({ role, leader, leaders, onCancel, onApply }: {
  role: InventoryRole; leader: string; leaders: DirectoryPerson[]; onCancel: () => void; onApply: (role: InventoryRole, leader: string) => void;
}) {
  const { language, t } = useLanguage();
  const [draftRole, setDraftRole] = useState(role);
  const [draftLeader, setDraftLeader] = useState(leader || leaders[0]?.id || "");
  return <DialogContent className="max-h-[85dvh] overflow-y-auto bg-white p-6 [font-family:Arial,'Tahoma',sans-serif] sm:max-w-md">
    <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3"><Users size={27} /></span><div><DialogTitle>{t("โปรไฟล์และบทบาท", "Profile & role")}</DialogTitle><DialogDescription className="mt-1 text-xs leading-5">{t("เลือกบทบาทและผู้ปฏิบัติงานสำหรับพื้นที่ทำงานนี้", "Choose the role and operator for this workspace.")}</DialogDescription></div></div>
    <form onSubmit={(event) => { event.preventDefault(); if (draftRole !== "site_leader" || draftLeader) onApply(draftRole, draftLeader); }} className="space-y-5">
      <label className="block text-sm font-medium text-slate-700">{t("บทบาท", "Role")}<select aria-label={t("บทบาท", "Role")} value={draftRole} onChange={(event) => setDraftRole(event.target.value as InventoryRole)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base">{roles.map((item) => <option key={item} value={item}>{WORKFLOW_ROLES[item][language]}</option>)}</select></label>
      {draftRole === "site_leader" ? <label className="block text-sm font-medium text-slate-700">{t("ผู้ปฏิบัติงาน", "Operator")}<select aria-label={t("ผู้ปฏิบัติงาน", "Operator")} required value={draftLeader} onChange={(event) => setDraftLeader(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base"><option value="">{t("เลือก Site Leader", "Select a Site Leader")}</option>{leaders.map((person) => <option key={person.id} value={person.id}>{person.name}{person.employeeNo ? ` · ${person.employeeNo}` : ""}</option>)}</select>{!leaders.length && <span className="mt-2 block text-xs font-normal leading-5 text-amber-800">{t("ยังไม่มี Site Leader ที่เปิดใช้งาน กรุณาเพิ่มในทำเนียบก่อน", "No active Site Leader is available. Add one in Directory first.")}</span>}</label> : <p className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-500">{t("บทบาทส่วนกลาง เลือกดูทุกไซต์หรือเฉพาะไซต์ได้ที่แถบขอบเขตข้อมูล", "Central role. Choose all sites or a specific site from the viewing scope bar.")}</p>}
      <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={onCancel} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm">{t("ยกเลิก", "Cancel")}</button><button type="submit" disabled={draftRole === "site_leader" && !draftLeader} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400">{t("ใช้โปรไฟล์นี้", "Apply profile")}</button></div>
    </form>
  </DialogContent>;
}
