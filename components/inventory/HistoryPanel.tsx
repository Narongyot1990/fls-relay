"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, ArrowRight, CheckCircle2, Send, Undo2 } from "lucide-react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { LoadingIcon } from "./LoadingIcon";

interface HistoryRow {
  id: string; type: "transfer" | "receipt" | "issue" | "return" | "exchange";
  deviceLabel: string; fromHolderName: string | null; toHolderName: string | null;
  fromSiteName: string | null; toSiteName: string | null; condition?: "ok" | "damaged"; actorRole: string; at: string;
}
const icons = { transfer: Send, receipt: CheckCircle2, issue: ArrowRight, return: Undo2, exchange: ArrowLeftRight };

export function HistoryPanel({ headers, site }: { headers: Record<string, string>; site: string }) {
  const { language, t } = useLanguage();
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/inventory/history?site=${encodeURIComponent(site)}`, { headers, signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || "Cannot load history"); if (!controller.signal.aborted) setRows(result.transactions); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Cannot load history"); });
    return () => controller.abort();
  }, [headers, site]);
  const labels: Record<HistoryRow["type"], [string, string]> = {
    transfer: ["โอนไปไซต์", "Transferred to site"], receipt: ["ยืนยันรับเครื่องที่ไซต์", "Receipt confirmed at site"],
    issue: ["จ่ายให้คนขับ", "Issued to driver"], return: ["รับคืนจากคนขับ", "Returned from driver"], exchange: ["เปลี่ยนเครื่อง", "Exchanged"],
  };
  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{t(error)}</p>;
  if (!rows) return <div role="status" className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700"><LoadingIcon />{t("กำลังอ่านประวัติ…", "Loading history…")}</div>;
  if (!rows.length) return <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{t("ยังไม่มีรายการในขอบเขตนี้", "No history in this scope yet.")}</p>;
  return <div className="space-y-3">{rows.map((row) => { const Icon = icons[row.type]; const [th, en] = labels[row.type];
    const to = row.toHolderName || row.toSiteName; const from = row.fromHolderName || row.fromSiteName;
    return <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon size={17} /></span>
        <div className="min-w-0 flex-1"><p className="font-semibold text-blue-700">{row.deviceLabel}</p><p className="text-xs text-slate-500">{t(th, en)}{from ? ` · ${from}` : ""}{to ? ` → ${to}` : ""}{row.condition === "damaged" ? ` · ${t("เสียหาย", "Damaged")}` : ""}</p></div>
        <time className="shrink-0 text-xs text-slate-400">{new Date(row.at).toLocaleString(language === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</time>
      </div>
    </article>; })}</div>;
}
