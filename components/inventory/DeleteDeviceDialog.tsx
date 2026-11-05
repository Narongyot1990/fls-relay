"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { InventoryItem } from "@/lib/inventory";
import { LoadingIcon } from "./LoadingIcon";

export function DeleteDeviceDialog({ device, busy, error, onCancel, onConfirm }: {
  device: InventoryItem; busy: boolean; error: string | null; onCancel: () => void; onConfirm: () => void;
}) {
  const { t } = useLanguage();
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onCancel(); }}>
    <DialogContent showCloseButton={!busy} className="max-w-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-xl">
      <DialogTitle className="break-words pr-6 text-lg leading-7">{t("ลบ")}{" "}{device.deviceId}{" "}{t("ออกจากฐานข้อมูลจริง?")}</DialogTitle>
      <DialogDescription className="leading-6 text-slate-600">{t("ใช้สำหรับการลงทะเบียนผิดเท่านั้น ระบบจะปฏิเสธหากมีประวัติการดูแลเครื่อง การลบย้อนกลับไม่ได้")}</DialogDescription>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700">{t(error)}</p>}
      <div className="mt-2 flex justify-end gap-3">
        <button type="button" onClick={onCancel} disabled={busy} className="min-h-11 rounded-lg border border-slate-200 bg-white px-4 text-sm disabled:opacity-50">{t("ยกเลิก")}</button>
        <button type="button" onClick={onConfirm} disabled={busy} aria-busy={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{busy && <LoadingIcon />}{busy ? t("กำลังลบ…") : t("ยืนยันลบ")}</button>
      </div>
    </DialogContent>
  </Dialog>;
}
