"use client";

import { ArrowLeft, ArrowRight, ArrowRightLeft, CheckCircle2, ChevronRight, ClipboardList, FileText, History, Home, MapPin, ShieldCheck, Smartphone, Upload, Users } from "lucide-react";
import { WORKFLOW_ACTIONS, WORKFLOW_ROLES, type WorkflowActionId } from "@/lib/workflow-structure";
import type { InventoryRole } from "@/lib/inventory";
import { useLanguage } from "@/components/shared/LanguageProvider";

const icons = { dashboard: Home, inventory: ClipboardList, receive: Upload, technical: ShieldCheck, transfer: ArrowRight, receipt: CheckCircle2, issue: Smartphone, return: ArrowLeft, exchange: ArrowRightLeft, history: History, policy: FileText, users: Users, directory: MapPin };
const colors: Record<WorkflowActionId, string> = {
  dashboard: "from-blue-500 to-blue-600", issue: "from-blue-500 to-blue-600", return: "from-emerald-500 to-emerald-600",
  exchange: "from-violet-500 to-violet-600", inventory: "from-amber-500 to-amber-600", history: "from-cyan-500 to-cyan-600",
  receive: "from-blue-500 to-blue-600", technical: "from-teal-500 to-teal-600", transfer: "from-violet-500 to-violet-600",
  receipt: "from-emerald-500 to-emerald-600", users: "from-blue-500 to-blue-600", directory: "from-violet-500 to-violet-600", policy: "from-blue-500 to-blue-600",
};

export function RoleHome({ role, onAction, pending = false }: { pending?: boolean; role: InventoryRole; onAction: (action: WorkflowActionId) => void }) {
  const { language, t } = useLanguage();
  return <section>
    <h2 className="mb-4 text-sm font-semibold text-slate-700">{t("คุณต้องการทำอะไร?")}</h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {WORKFLOW_ROLES[role].actions.filter((id) => id !== "dashboard").map((id) => {
        const Icon = icons[id];
        const live = id === "inventory" || id === "receive" || id === "directory";
        return <button key={id} type="button" disabled={pending} onClick={() => onAction(id)} className="group rounded-xl border border-slate-200 bg-white p-6 text-left transition duration-200 hover:border-blue-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <div className="mb-5 flex items-start justify-between gap-2"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${colors[id]}`}><Icon size={24} strokeWidth={1.75} /></span><span className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${live ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{live ? t("ข้อมูลจริง") : id === "issue" ? t("ทบทวน UI") : t("โครงหน้าสำหรับรีวิว")}</span></div>
          <h3 className="text-lg font-semibold">{WORKFLOW_ACTIONS[id][language]}</h3>{language === "th" && <p className="mt-1 text-xs text-slate-400">{WORKFLOW_ACTIONS[id].en}</p>}
          <p className="mt-3 text-sm leading-6 text-slate-500">{t(WORKFLOW_ACTIONS[id].detail)}</p><ChevronRight size={17} className="mt-5 text-slate-300 group-hover:text-blue-600" />
        </button>;
      })}
    </div>
  </section>;
}
