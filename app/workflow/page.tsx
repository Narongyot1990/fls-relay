"use client";

import { useState } from "react";
import Link from "next/link";
import { WORKFLOW_ACTIONS, WORKFLOW_ROLES, type WorkflowAudience, type WorkflowActionId } from "@/lib/workflow-structure";
import { useLanguage, LanguageSwitcher } from "@/components/shared/LanguageProvider";

export default function WorkflowStructurePage() {
  const { language, t } = useLanguage();
  const [role, setRole] = useState<WorkflowAudience>("implementation");
  const [selected, setSelected] = useState<WorkflowActionId | null>(null);
  const current = WORKFLOW_ROLES[role];

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <LanguageSwitcher />
        <p className="text-sm text-neutral-500">{t("โครงสร้างสำหรับทบทวน", "Structure preview")}</p>
        <h1 className="text-2xl font-semibold">{t("บทบาทและงานของผู้ใช้", "User roles and actions")}</h1>
        <p className="text-sm text-neutral-600">{t("เลือกบทบาทเพื่อดูเมนูที่เสนอ ปุ่มแสดงรายละเอียดของงาน ยังไม่บันทึกรายการจริง", "Select a role to review its menu and action details. No transactions are saved here.")}</p>
        <Link href="/preview" className="inline-flex min-h-12 items-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">{t("เปิด UI · ส่งมอบโทรศัพท์ →", "Open app · Phone handover →")}</Link>
      </header>
      <div className="space-y-2">
        <label htmlFor="workflow-role" className="block font-medium">{t("บทบาท")}</label>
        <select id="workflow-role" value={role} onChange={(event) => {
          setRole(event.target.value as WorkflowAudience);
          setSelected(null);
        }} className="min-h-12 w-full rounded-lg border border-neutral-300 bg-white px-3">
          {Object.entries(WORKFLOW_ROLES).map(([id, item]) => (
            <option key={id} value={id}>{item[language]}</option>
          ))}
        </select>
      </div>
      <section className="space-y-2 rounded-lg border border-neutral-200 p-4">
        <h2 className="font-semibold">{current[language]}</h2>
        <p className="text-sm">{t("ขอบเขต", "Scope")}: {t(current.scope)}</p>
        <p className="text-sm text-neutral-600">{t(current.note)}</p>
      </section>
      <section aria-label={t("งานของบทบาทที่เลือก", "Actions for the selected role")} className="grid gap-3 sm:grid-cols-2">
        {current.actions.map((id) => (
          <button key={id} type="button" aria-pressed={selected === id} onClick={() => setSelected(id)}
            className={`min-h-20 rounded-lg border p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${selected === id ? "border-neutral-900 bg-neutral-100" : "border-neutral-300 bg-white"}`}>
            <span className="block font-medium">{WORKFLOW_ACTIONS[id][language]}</span>
            {language === "th" && <span className="text-sm text-neutral-500">{WORKFLOW_ACTIONS[id].en}</span>}
          </button>
        ))}
      </section>
      <section aria-live="polite" className="rounded-lg bg-neutral-100 p-4">
        {selected ? <><h2 className="font-medium">{WORKFLOW_ACTIONS[selected][language]}</h2><p className="mt-2 text-sm">{t(WORKFLOW_ACTIONS[selected].detail)}</p></> : <p className="text-sm text-neutral-600">{t("เลือกงานเพื่ออ่านขอบเขตการทำงาน", "Select an action to review its scope.")}</p>}
      </section>
    </main>
  );
}
