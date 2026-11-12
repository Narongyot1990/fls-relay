"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Search, Check, ShieldCheck } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { DirectorySite } from "@/lib/directory";
import { countForStatus, type SiteSummary } from "@/lib/site-tracking";

export function WorkspaceScope({ site, label, sites, locked, disabled, onChange, compact = false, summaries = [], status = "all" }: {
  site: string; label: string; sites: DirectorySite[]; locked: boolean; disabled: boolean; onChange: (id: string) => void;
  compact?: boolean; summaries?: SiteSummary[]; status?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  if (compact) return <div data-testid="workspace-scope" className="min-w-0">
    {locked ? <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm"><ShieldCheck size={16} /><span className="truncate">{label}</span></div> : <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<button type="button" disabled={disabled} aria-label={t("เปลี่ยนขอบเขต", "Change scope")} title={label} className="flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 text-left text-sm disabled:opacity-50" />}><MapPin size={16} /><span className="min-w-0 flex-1 truncate">{label}</span><span aria-hidden="true" className="text-slate-400">⌄</span></DialogTrigger>{open && <ScopeForm site={site} sites={sites} summaries={summaries} status={status} onSelect={(id) => { setOpen(false); onChange(id); }} />}</Dialog>}
  </div>;
  return <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2" data-testid="workspace-scope">
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${locked ? "bg-emerald-50" : "bg-blue-50"}`}>{locked ? <ShieldCheck size={16} /> : <MapPin size={16} />}</span>
    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{label}</p>
    {!locked && <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<button type="button" disabled={disabled} className="min-h-9 shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50" />}>{t("เปลี่ยนขอบเขต", "Change scope")}</DialogTrigger>{open && <ScopeForm site={site} sites={sites} onSelect={(id) => { setOpen(false); onChange(id); }} />}</Dialog>}
  </div>;
}

function ScopeForm({ site, sites, onSelect, summaries = [], status = "all" }: { site: string; sites: DirectorySite[]; onSelect: (id: string) => void; summaries?: SiteSummary[]; status?: string }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const matches = sites.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(query.trim().toLowerCase()));
  const count = (id: string) => {
    if (id === "all") return summaries.reduce((sum, row) => sum + countForStatus(row, status), 0);
    const row = summaries.find((item) => (item.siteId || "central") === id);
    return row ? countForStatus(row, status) : 0;
  };
  return <DialogContent className="max-h-[85dvh] overflow-y-auto bg-white p-6 [font-family:Arial,'Tahoma',sans-serif] sm:max-w-lg"><DialogTitle>{t("เลือกขอบเขตข้อมูล", "Choose viewing scope")}</DialogTitle><DialogDescription className="leading-6">{t("ใช้กับรายการโทรศัพท์ บุคลากร และประวัติในพื้นที่ทำงานนี้", "Applies to phones, people and history in this workspace.")}</DialogDescription>
    <div className="grid grid-cols-2 gap-3">{[{ id: "all", title: t("ทุกไซต์", "All sites"), detail: t("ภาพรวมทั้งบริษัท", "Company overview") }, { id: "central", title: t("สต็อกส่วนกลาง", "Central stock"), detail: t("เครื่องที่ยังไม่สังกัดไซต์", "Unallocated phones") }].map((item) => <button key={item.id} type="button" aria-label={item.title} aria-pressed={site === item.id} onClick={() => onSelect(item.id)} className={`min-h-20 rounded-xl border p-3 text-left ${site === item.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><strong className="block text-sm text-slate-800">{item.title}{summaries.length > 0 && <span className="ml-2 tabular-nums text-blue-700">{count(item.id)}</span>}</strong><span className="mt-2 block text-xs leading-5 text-slate-500">{item.detail}</span></button>)}</div>
    <label className="relative block"><span className="sr-only">{t("ค้นหาไซต์", "Search sites")}</span><Search size={17} className="absolute left-3 top-3.5" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("ค้นหาชื่อหรือรหัสไซต์", "Search site name or code")} className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm" /></label>
    <div className="max-h-[40dvh] space-y-2 overflow-y-auto" aria-label={t("ไซต์ที่เลือกดูได้", "Available sites")}>{matches.map((item) => <button key={item.id} type="button" aria-pressed={site === item.id} onClick={() => onSelect(item.id)} className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left ${site === item.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><MapPin size={22} /><span className="min-w-0 flex-1"><strong className="block break-words text-sm text-slate-800">{item.name}</strong><span className="mt-1 block text-xs text-slate-500">{item.code}{!item.active ? ` · ${t("ปิดใช้งาน", "Inactive")}` : ""}</span></span>{summaries.length > 0 && <span className="text-sm font-semibold tabular-nums text-blue-700">{count(item.id)}</span>}{site === item.id && <Check size={18} />}</button>)}{!matches.length && <p className="p-4 text-center text-sm text-slate-500">{t("ไม่พบไซต์ที่ตรงกับการค้นหา", "No sites match your search.")}</p>}</div>
  </DialogContent>;
}
