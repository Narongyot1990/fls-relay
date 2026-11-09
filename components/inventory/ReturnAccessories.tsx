"use client";

import { useState } from "react";
import policy from "@/lib/policies/smartphone-handover.json";
import type { AccessoryReturnInput } from "@/lib/accessories";
import type { InventoryItem } from "@/lib/inventory";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { AccessorySummary } from "./AccessorySummary";

export function useAccessoryReturn(device: InventoryItem | undefined) {
  const key = `${device?.id}:${device?.assignment?.id}`;
  const [draft, setDraft] = useState<{ key: string; value: AccessoryReturnInput } | null>(null);
  const value: AccessoryReturnInput = draft?.key === key ? draft.value : { assignmentId: device?.assignment?.id, returnedAccessories: [], accessoriesChecked: false, accessoryNotes: "" };
  const issued = device?.assignment?.accessories;
  const missing = issued?.filter((id) => !value.returnedAccessories.includes(id)) || [];
  const ready = !issued?.length || (value.accessoriesChecked && (!missing.length || Boolean(value.accessoryNotes.trim())));
  return { value, ready, setValue: (next: AccessoryReturnInput) => setDraft({ key, value: next }) };
}

export function ReturnAccessories({ device, value, onChange, disabled = false }: {
  device: InventoryItem; value: AccessoryReturnInput; onChange: (value: AccessoryReturnInput) => void; disabled?: boolean;
}) {
  const { language, t } = useLanguage();
  const issued = device.assignment?.accessories;
  const missing = issued?.filter((id) => !value.returnedAccessories.includes(id)) || [];
  return <div className="mt-5 space-y-3" data-testid="return-accessories">
    <AccessorySummary issued={issued} />
    {Boolean(issued?.length) && <fieldset disabled={disabled} className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4"><legend className="px-1 text-sm font-medium">{t("ตรวจอุปกรณ์ที่ได้รับคืนจริง", "Check accessories physically received")}</legend>
      <p className="text-xs leading-5 text-slate-500">{t("ติ๊กเฉพาะสิ่งที่ได้รับคืน รายการที่ไม่ติ๊กจะถูกบันทึกว่ายังไม่ได้คืน", "Tick only items physically received. Unticked items will be recorded as missing.")}</p>
      {issued?.map((id) => <label key={id} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={value.returnedAccessories.includes(id)} onChange={(event) => onChange({ ...value, accessoriesChecked: false, returnedAccessories: event.target.checked ? [...value.returnedAccessories, id] : value.returnedAccessories.filter((item) => item !== id) })} />{policy.accessories[id][language]}</label>)}
      <p className="text-sm font-medium">{t(`ได้รับคืน ${value.returnedAccessories.length}/${issued?.length} รายการ`, `Received ${value.returnedAccessories.length}/${issued?.length} items`)}</p>
      <label className="flex min-h-11 items-center gap-3 border-t border-blue-100 pt-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-blue-600" checked={value.accessoriesChecked} onChange={(event) => onChange({ ...value, accessoriesChecked: event.target.checked })} />{t("ตรวจรายการอุปกรณ์คืนแล้ว", "I checked the returned accessories")}</label>
    </fieldset>}
    <label className="block text-sm font-medium">{missing.length ? t("เหตุผล / หมายเหตุอุปกรณ์ที่ยังไม่ได้คืน (จำเป็น)", "Missing accessory notes (required)") : t("หมายเหตุอุปกรณ์ (ถ้ามี)", "Accessory notes (optional)")}<textarea disabled={disabled} required={missing.length > 0} maxLength={1000} value={value.accessoryNotes} onChange={(event) => onChange({ ...value, accessoryNotes: event.target.value })} className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal" /></label>
    {missing.length > 0 && <p className="text-xs leading-5 text-amber-800">{t("ยังไม่ได้คืน", "Missing")}: {missing.map((id) => policy.accessories[id][language]).join(", ")}</p>}
  </div>;
}
