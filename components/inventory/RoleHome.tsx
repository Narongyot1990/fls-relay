"use client";

import { ArrowLeft, ArrowRight, ArrowRightLeft, CheckCircle2, ChevronRight, ClipboardList, FileText, History, MapPin, ShieldCheck, Smartphone, Users } from "lucide-react";
import { WORKFLOW_ACTIONS, WORKFLOW_ROLES, type WorkflowActionId } from "@/lib/workflow-structure";
import type { InventoryRole } from "@/lib/inventory";
import { useLanguage } from "@/components/shared/LanguageProvider";

// This grid is the only navigation surface — every destination is a button here.
const icons = { inventory: ClipboardList, directory: MapPin, technical: ShieldCheck, transfer: ArrowRight, receipt: CheckCircle2, issue: Smartphone, return: ArrowLeft, exchange: ArrowRightLeft, history: History, policy: FileText, users: Users };
const colors: Record<keyof typeof icons, string> = {
  inventory: "from-amber-500 to-amber-600", directory: "from-violet-500 to-violet-600",
  issue: "from-blue-500 to-blue-600", return: "from-emerald-500 to-emerald-600", exchange: "from-violet-500 to-violet-600",
  history: "from-cyan-500 to-cyan-600", technical: "from-teal-500 to-teal-600", transfer: "from-violet-500 to-violet-600",
  receipt: "from-emerald-500 to-emerald-600", users: "from-blue-500 to-blue-600", policy: "from-blue-500 to-blue-600",
};
// "receive" isn't its own menu entry — it's the Add button inside Devices (inventory).
const hiddenFromMenu = new Set<WorkflowActionId>(["dashboard", "receive"]);

export function RoleHome({ role, onAction, pending = false }: { pending?: boolean; role: InventoryRole; onAction: (action: WorkflowActionId) => void }) {
  const { language, t } = useLanguage();
  const actions = WORKFLOW_ROLES[role].actions.filter((id): id is keyof typeof icons => !hiddenFromMenu.has(id));
  if (!actions.length) return null;
  return <nav aria-label={t("เมนูหลัก", "Main menu")}>
    <h2 className="mb-3 text-sm font-semibold text-slate-700">{t("คุณต้องการทำอะไร?")}</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((id) => {
        const Icon = icons[id];
        return <button key={id} type="button" disabled={pending} onClick={() => onAction(id)} className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition duration-200 hover:border-blue-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${colors[id]}`}><Icon size={20} strokeWidth={1.75} /></span>
            <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{WORKFLOW_ACTIONS[id][language]}</h3><p className="truncate text-xs text-slate-500">{t(WORKFLOW_ACTIONS[id].detail)}</p></div>
            <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-blue-600" />
          </div>
        </button>;
      })}
    </div>
  </nav>;
}
