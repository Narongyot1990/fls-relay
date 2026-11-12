"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2 } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { ReceiptPanel } from "@/components/inventory/ReceiptPanel";
import type { InventoryItem } from "@/lib/inventory";

export function ReceiptBell({ devices, headers, disabled, onDone }: {
  devices: InventoryItem[]; headers: Record<string, string>; disabled: boolean; onDone: () => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const count = devices.filter((item) => item.status === "in_transit").length;
  const label = count ? t(`ยืนยันรับเครื่อง (${count} รอดำเนินการ)`, `Confirm receipt (${count} pending)`) : t("ยืนยันรับเครื่อง", "Confirm receipt");
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger render={<button type="button" aria-label={label} disabled={disabled} className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-slate-200 bg-white p-1.5 transition hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-50" />}>
      <CheckCircle2 size={20} />
      {count > 0 && <span aria-hidden="true" className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{count > 99 ? "99+" : count}</span>}
    </DialogTrigger>
    {open && <DialogContent className="max-h-[85dvh] overflow-y-auto bg-white p-6 [font-family:Arial,'Tahoma',sans-serif] sm:max-w-md">
      <DialogTitle>{t("ยืนยันรับเครื่อง", "Confirm receipt")}</DialogTitle>
      <DialogDescription className="mt-1 text-xs leading-5">{t("ยืนยันเครื่องที่ส่งมาถึงไซต์ของคุณ เครื่องจะเข้าสต็อกของไซต์ทันทีที่ยืนยัน", "Confirm devices that have arrived at your site. They join your site stock the moment you confirm.")}</DialogDescription>
      <div className="mt-4"><ReceiptPanel devices={devices} headers={headers} onDone={() => { setOpen(false); onDone(); }} /></div>
    </DialogContent>}
  </Dialog>;
}
