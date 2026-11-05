"use client";

import policy from "@/lib/policies/smartphone-handover.json";
import { useLanguage } from "@/components/shared/LanguageProvider";

export function AgreementTerms({ accessories, onAccessoriesChange }: {
  accessories: number[]; onAccessoriesChange: (accessories: number[]) => void;
}) {
  const { language, t } = useLanguage();
  return <div className="space-y-7 py-7 text-sm leading-8 text-slate-600" data-policy-version={policy.sha256}>
    {policy.sections.map((section, index) => <section key={section.title.en}>
      <h3 className="mb-3 font-semibold text-slate-900">{section.title[language]}</h3>
      <div className="space-y-3">{section.paragraphs.map((paragraph, row) => <p key={row} className={/^[•\d]+[.\s]/.test(paragraph.en) ? "pl-4" : undefined}>{paragraph[language]}</p>)}</div>
      {index === 0 && <fieldset className="mt-5 rounded-lg bg-slate-50 p-4"><legend className="px-1 font-medium text-slate-900">{policy.accessoriesTitle[language]}</legend>
        <div className="grid gap-3 sm:grid-cols-2">{policy.accessories.map((accessory, id) => <label key={accessory.en} className="flex min-h-11 cursor-pointer items-center gap-3"><input type="checkbox" checked={accessories.includes(id)} onChange={(event) => onAccessoriesChange(event.target.checked ? [...accessories, id] : accessories.filter((item) => item !== id))} className="h-5 w-5 accent-blue-600" />{accessory[language]}</label>)}</div>
      </fieldset>}
    </section>)}
    <p className="border-t border-slate-100 pt-4 text-xs leading-6 text-slate-400">{t("ข้อกำหนดจากเอกสารที่ระบุ")}: {policy.source}</p>
  </div>;
}
