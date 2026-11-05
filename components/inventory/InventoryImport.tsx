"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, CheckCircle2 } from "lucide-react";
import type { ImportPreview } from "@/lib/inventory";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { LoadingIcon } from "./LoadingIcon";

export function InventoryImport({ headers, onImported, onBusyChange }: { headers: Record<string, string>; onImported: () => void; onBusyChange?: (busy: boolean) => void }) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [sheet, setSheet] = useState("");
  const [operation, setOperation] = useState<"preview" | "import" | null>(null);
  const busy = operation !== null;
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<{ created: string[]; skipped: string[]; failed: { deviceId: string; error: string }[] } | null>(null);
  const requestId = useRef(0);
  const ready = preview?.rows.filter((row) => !row.existing && !row.errors.length) ?? [];
  const invalid = preview?.rows.filter((row) => row.errors.length) ?? [];
  const existing = preview?.rows.filter((row) => row.existing).length ?? 0;

  async function inspect() {
    if (!file || busy || inFlight.current) return;
    inFlight.current = true;
    const id = ++requestId.current;
    setOperation("preview"); onBusyChange?.(true); setError(null); setPreview(null); setResult(null); setConfirmed(false);
    const form = new FormData(); form.set("file", file);
    if (identifier) form.set("identifier", identifier);
    if (sheet) form.set("sheet", sheet);
    try {
      const response = await fetch("/api/inventory/import/preview", { method: "POST", headers, body: form });
      const data = await response.json();
      if (id !== requestId.current) return;
      if (!response.ok) throw new Error(data.error || "Cannot preview this file");
      setPreview(data); setIdentifier(data.identifier); setSheet(data.sheet);
    } catch (cause) { if (id === requestId.current) setError(cause instanceof Error ? cause.message : "Cannot preview file"); }
    finally { inFlight.current = false; if (id === requestId.current) { setOperation(null); onBusyChange?.(false); } }
  }

  async function commit() {
    if (!preview || !confirmed || busy || !ready.length || result || inFlight.current) return;
    inFlight.current = true;
    setOperation("import"); onBusyChange?.(true); setError(null);
    try {
      const response = await fetch("/api/inventory/import", { method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, filename: preview.filename, rows: ready }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Import failed");
      setResult(data); setConfirmed(false); onImported();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Import failed. Refresh inventory before retrying."); }
    finally { inFlight.current = false; setOperation(null); onBusyChange?.(false); }
  }

  return <div className="space-y-5">
    <div><h2 className="text-xl font-semibold">{t("นำเข้าเครื่องจาก Intune · CSV / Excel")}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{t("เลือกไฟล์ → ตรวจข้อมูลและรายการซ้ำ → ยืนยันนำเข้า ไม่มีการบันทึกเมื่อเลือกไฟล์หรือกดตรวจข้อมูล")}</p></div>
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-medium"><FileSpreadsheet size={18} />{t(" ไฟล์ .csv หรือ .xlsx (ไม่เกิน 5 MB / 2,000 รายการ)")}</span>
        <input type="file" accept=".csv,.xlsx" disabled={busy} onChange={(event) => {
          requestId.current++; setFile(event.target.files?.[0] ?? null); setPreview(null); setIdentifier(""); setSheet(""); setError(null); setResult(null); setConfirmed(false);
        }} className="block w-full rounded-lg border border-slate-200 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-blue-700" />
      </label>
      {preview && <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">{t("คอลัมน์ที่จะใช้เป็น Device ID")}<select value={identifier} disabled={busy || Boolean(result)} onChange={(event) => { setIdentifier(event.target.value); setConfirmed(false); }} className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3">{preview.headers.map((name) => <option key={name}>{name}</option>)}</select></label>
        {preview.sheets.length > 0 && <label className="text-sm font-medium">Worksheet<select value={sheet} disabled={busy || Boolean(result)} onChange={(event) => { setSheet(event.target.value); setConfirmed(false); }} className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3">{preview.sheets.map((name) => <option key={name}>{name}</option>)}</select></label>}
      </div>}
      <button type="button" disabled={!file || busy} aria-busy={operation === "preview"} onClick={inspect} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white disabled:bg-slate-200 disabled:text-slate-400">{operation === "preview" ? <LoadingIcon /> : <Upload size={16} />}{operation === "preview" ? t("กำลังดำเนินการ…") : t("ตรวจข้อมูลก่อนนำเข้า (ไม่บันทึก)")}</button>
      <p className="text-xs leading-6 text-slate-500">{t("ไฟล์ตัวอย่างนี้มี Device name และข้อมูล MDM แต่ไม่มี IMEI/Serial/รุ่น/เบอร์โทร จึงเก็บช่องที่ไม่มีข้อมูลว่างไว้ ไม่มีการเดารุ่นหรือสร้าง IMEI สมมติ")}</p>
    </section>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{t(error)}</p>}
    {preview && <>
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">{t("ใช้ ")}<strong>{preview.identifier}</strong>{t(" เป็น Device ID สำหรับไฟล์นี้ กรุณาตรวจว่าเป็นตัวระบุที่ต้องการ โดย Device name ของ Intune อาจเปลี่ยนได้ หากมี Device ID ของบริษัท ให้เลือกคอลัมน์นั้นแทนแล้วกดตรวจข้อมูลอีกครั้ง")}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[[t("ทั้งหมด"), preview.rows.length], [t("พร้อมนำเข้า"), ready.length], [t("มีในระบบแล้ว (ข้าม)"), existing], [t("ข้อมูลผิด/ซ้ำในไฟล์"), invalid.length]].map(([label, count]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{count}</p></div>)}</div>
      <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100 text-slate-600"><tr>{[t("แถว"), "Device ID", "Managed by", "OS / Version", "Compliance", "Last check-in", t("ผลตรวจ")].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}</tr></thead><tbody>{preview.rows.map((row) => <tr key={row.row} className="border-t border-slate-100"><td className="px-4 py-3">{row.row}</td><td className="whitespace-nowrap px-4 py-3 font-medium">{row.deviceId || "—"}</td><td className="px-4 py-3">{row.managedBy || "—"}</td><td className="whitespace-nowrap px-4 py-3">{row.os} {row.osVersion}</td><td className="px-4 py-3">{row.compliance || "—"}</td><td className="whitespace-nowrap px-4 py-3">{row.lastCheckIn || "—"}</td><td className={`min-w-44 px-4 py-3 ${row.errors.length ? "text-red-600" : row.existing ? "text-amber-700" : "text-emerald-700"}`}>{row.errors.map((error) => t(error)).join("; ") || (row.existing ? t("มีแล้ว · ไม่แก้ทับ") : t("พร้อมนำเข้า"))}</td></tr>)}</tbody></table></div>
      {!result && <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm leading-6 text-slate-600">{t("เครื่องที่นำเข้าจะอยู่ใน ")}<strong>{t("สต็อกส่วนกลาง · ยังไม่จัดสรรไซต์")}</strong>{t(" โดยไม่มีผู้ถือเครื่อง รายการซ้ำจะถูกข้าม และข้อมูลเดิมจะไม่ถูกแก้ทับ")}</p>
        {invalid.length > 0 && <p className="text-sm text-amber-700">{t("แถวที่มีข้อผิดพลาดจะไม่ถูกนำเข้า โปรดตรวจจำนวนพร้อมนำเข้าก่อนยืนยัน")}</p>}
        <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" /><span>{t("ฉันตรวจข้อมูลแล้ว และต้องการบันทึก ")}{ready.length}{t(" เครื่องลงฐานข้อมูลจริง")}</span></label>
        <button type="button" onClick={commit} disabled={busy || !confirmed || !ready.length || identifier !== preview.identifier || sheet !== preview.sheet} aria-busy={operation === "import"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400">{operation === "import" && <LoadingIcon />}{operation === "import" ? t("กำลังบันทึก…") : `${t("ยืนยันนำเข้า")} ${ready.length} ${t("เครื่อง")}`}</button>
        {(identifier !== preview.identifier || sheet !== preview.sheet) && <p className="text-sm text-amber-700">{t("เปลี่ยนการจับคู่แล้ว กรุณากดตรวจข้อมูลอีกครั้ง")}</p>}
      </section>}
    </>}
    {result && <section role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="flex items-center gap-2 font-semibold text-emerald-800"><CheckCircle2 size={20} />{t("ผลการนำเข้าฐานข้อมูลจริง")}</h3><p className="mt-3 text-sm">{t("เพิ่ม ")}{result.created.length}{t(" · ข้ามรายการซ้ำ ")}{result.skipped.length}{t(" · ไม่สำเร็จ ")}{result.failed.length}</p>{result.failed.map((item) => <p key={item.deviceId} className="mt-2 text-sm text-red-700">{item.deviceId}: {t(item.error)}</p>)}<p className="mt-3 text-xs leading-6">{t("เปิดรายการเครื่องเพื่อดู แก้ไข หรือลบรายการที่ยังไม่เคยใช้งานได้ การตรวจไฟล์ใหม่ไม่ได้บันทึกเพิ่มจนกว่าจะยืนยันอีกครั้ง")}</p></section>}
  </div>;
}
