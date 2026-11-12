"use client";

import { Send, Undo2, ArrowRightLeft, ChevronRight, ClipboardList, FileText, History, MapPin, Smartphone } from "@/components/shared/BrandIcon";
import { WORKFLOW_ACTIONS, WORKFLOW_ROLES, type WorkflowActionId } from "@/lib/workflow-structure";
import type { InventoryRole } from "@/lib/inventory";
import { useLanguage } from "@/components/shared/LanguageProvider";

// This grid is the only navigation surface — every destination is a button here or behind "More".
const icons = { site_tracking: MapPin, inventory: ClipboardList, directory: MapPin, transfer: Send, issue: Smartphone, return: Undo2, exchange: ArrowRightLeft, history: History, policy: FileText };
const colors: Record<keyof typeof icons, string> = {
  site_tracking: "from-teal-50 to-blue-50",
  inventory: "from-amber-50 to-orange-50", directory: "from-blue-50 to-teal-50",
  issue: "from-blue-50 to-sky-50", return: "from-emerald-50 to-teal-50", exchange: "from-blue-50 to-teal-50",
  history: "from-cyan-50 to-blue-50", transfer: "from-blue-50 to-teal-50", policy: "from-blue-50 to-sky-50",
};
// "receive" is the Add button inside Devices; "receipt" is a header badge now; "dashboard" isn't implemented yet.
const hiddenFromMenu = new Set<WorkflowActionId>(["dashboard", "receive", "receipt"]);

export function RoleHome({ role, view = "primary", onAction, onMore, pending = false }: {
  pending?: boolean; role: InventoryRole; view?: "primary" | "more";
  onAction: (action: WorkflowActionId) => void; onMore: () => void;
}) {
  const { language, t } = useLanguage();
  const visible = WORKFLOW_ROLES[role].actions.filter((id): id is keyof typeof icons => !hiddenFromMenu.has(id));
  const primary = visible.filter((id) => WORKFLOW_ROLES[role].primaryActions.includes(id));
  const more = visible.filter((id) => !WORKFLOW_ROLES[role].primaryActions.includes(id));
  const actions = view === "more" ? more : primary;
  if (!actions.length && !(view === "primary" && more.length)) return null;
  return <nav aria-label={view === "more" ? t("เมนูเพิ่มเติม", "More menu") : t("เมนูหลัก", "Main menu")}>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((id) => {
        const Icon = icons[id];
        return <button key={id} type="button" aria-label={WORKFLOW_ACTIONS[id][language]} disabled={pending} onClick={() => onAction(id)} className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition duration-200 hover:border-blue-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm ${colors[id]}`}><Icon size={32} /></span>
            <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{WORKFLOW_ACTIONS[id][language]}</h3><p className="truncate text-xs text-slate-500">{t(WORKFLOW_ACTIONS[id].detail)}</p></div>
            <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-blue-600" />
          </div>
        </button>;
      })}
      {view === "primary" && more.length > 0 && <button type="button" aria-label={t("เมนูเพิ่มเติม", "More")} disabled={pending} onClick={onMore} className="group rounded-xl border border-dashed border-slate-300 bg-white p-4 text-left transition duration-200 hover:border-blue-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-lg font-bold tracking-widest text-slate-500 shadow-sm">···</span>
          <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{t("เมนูเพิ่มเติม", "More")}</h3><p className="truncate text-xs text-slate-500">{t("อุปกรณ์ ไซต์ ประวัติ และอื่นๆ", "Devices, sites, history and more")}</p></div>
          <ChevronRight size={16} className="shrink-0 text-slate-300 group-hover:text-blue-600" />
        </div>
      </button>}
    </div>
  </nav>;
}
