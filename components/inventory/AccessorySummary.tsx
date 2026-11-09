"use client";

import policy from "@/lib/policies/smartphone-handover.json";
import { useLanguage } from "@/components/shared/LanguageProvider";

export function AccessorySummary({ issued, returned, notes }: { issued?: number[]; returned?: number[]; notes?: string }) {
  const { language, t } = useLanguage();
  return <section className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm" aria-label={t("อุปกรณ์ที่ส่งมอบ", "Issued accessories")}>
    <h4 className="font-medium text-slate-800">{t("อุปกรณ์ที่ส่งมอบ", "Issued accessories")}</h4>
    {issued === undefined ? <p className="text-xs leading-5 text-amber-800">{t("ไม่มีข้อมูลอุปกรณ์ในใบจ่ายเดิม จึงยังยืนยันความครบถ้วนไม่ได้", "No accessory record on the original issue. Completeness cannot be verified.")}</p> : !issued.length ? <p className="text-xs text-slate-500">{t("ใบจ่ายระบุว่าไม่ได้ให้อุปกรณ์เสริม", "No accessories were issued.")}</p> : <ul className="space-y-2">{issued.map((id) => <li key={id} className="flex flex-wrap items-center justify-between gap-2"><span>{policy.accessories[id]?.[language] || String(id)}</span>{returned && <span className={`rounded-full px-2 py-1 text-xs font-medium ${returned.includes(id) ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{returned.includes(id) ? t("ได้รับคืน", "Received") : t("ยังไม่ได้คืน", "Missing")}</span>}</li>)}</ul>}
    {notes && <p className="whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">{t("หมายเหตุอุปกรณ์", "Accessory notes")}: {notes}</p>}
  </section>;
}
