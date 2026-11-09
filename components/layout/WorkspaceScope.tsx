"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Search, Check, ShieldCheck } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { DirectorySite } from "@/lib/directory";

export function WorkspaceScope({ site, label, sites, locked, disabled, onChange }: {
  site: string; label: string; sites: DirectorySite[]; locked: boolean; disabled: boolean; onChange: (id: string) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:px-5" data-testid="workspace-scope">
    <div className="flex min-w-0 flex-1 items-center gap-3"><span className={`shrink-0 rounded-xl p-2 ${locked ? "bg-emerald-50" : "bg-blue-50"}`}>{locked ? <ShieldCheck size={23} /> : <MapPin size={23} />}</span><div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{locked ? t("ไซต์สังกัด", "Assigned site") : t("ขอบเขตข้อมูล", "Viewing scope")}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{label}</p></div></div>
    {locked ? <span className="text-xs text-slate-500">{t("เฉพาะไซต์ของคุณ", "Your site only")}</span> : <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<button type="button" disabled={disabled} className="min-h-11 shrink-0 rounded-lg border border-slate-200 px-3 text-xs font-medium text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50" />}>{t("เปลี่ยนขอบเขต", "Change scope")}</DialogTrigger>{open && <ScopeForm site={site} sites={sites} onSelect={(id) => { setOpen(false); onChange(id); }} />}</Dialog>}
  </div>;
}

function ScopeForm({ site, sites, onSelect }: { site: string; sites: DirectorySite[]; onSelect: (id: string) => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const matches = sites.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <DialogContent className="max-h-[85dvh] overflow-y-auto bg-white p-6 [font-family:Arial,'Tahoma',sans-serif] sm:max-w-lg"><DialogTitle>{t("เลือกขอบเขตข้อมูล", "Choose viewing scope")}</DialogTitle><DialogDescription className="leading-6">{t("ใช้กับรายการโทรศัพท์ บุคลากร และประวัติในพื้นที่ทำงานนี้", "Applies to phones, people and history in this workspace.")}</DialogDescription>
    <div className="grid grid-cols-2 gap-3">{[{ id: "all", title: t("ทุกไซต์", "All sites"), detail: t("ภาพรวมทั้งบริษัท", "Company overview") }, { id: "central", title: t("สต็อกส่วนกลาง", "Central stock"), detail: t("เครื่องที่ยังไม่สังกัดไซต์", "Unallocated phones") }].map((item) => <button key={item.id} type="button" aria-label={item.title} aria-pressed={site === item.id} onClick={() => onSelect(item.id)} className={`min-h-20 rounded-xl border p-3 text-left ${site === item.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><strong className="block text-sm text-slate-800">{item.title}</strong><span className="mt-2 block text-xs leading-5 text-slate-500">{item.detail}</span></button>)}</div>
    <label className="relative block"><span className="sr-only">{t("ค้นหาไซต์", "Search sites")}</span><Search size={17} className="absolute left-3 top-3.5" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("ค้นหาชื่อหรือรหัสไซต์", "Search site name or code")} className="min-h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm" /></label>
    <div className="max-h-[40dvh] space-y-2 overflow-y-auto" aria-label={t("ไซต์ที่เลือกดูได้", "Available sites")}>{matches.map((item) => <button key={item.id} type="button" aria-pressed={site === item.id} onClick={() => onSelect(item.id)} className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left ${site === item.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}><MapPin size={22} /><span className="min-w-0 flex-1"><strong className="block break-words text-sm text-slate-800">{item.name}</strong><span className="mt-1 block text-xs text-slate-500">{item.code}{!item.active ? ` · ${t("ปิดใช้งาน", "Inactive")}` : ""}</span></span>{site === item.id && <Check size={18} />}</button>)}{!matches.length && <p className="p-4 text-center text-sm text-slate-500">{t("ไม่พบไซต์ที่ตรงกับการค้นหา", "No sites match your search.")}</p>}</div>
  </DialogContent>;
}
