"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { AccessorySummary } from "./AccessorySummary";
import { LoadingIcon } from "./LoadingIcon";

interface HistoryRow {
  id: string; deviceId: string; type: "transfer" | "receipt" | "issue" | "return" | "exchange";
  model?: string; deviceLabel: string; fromHolderName: string | null; toHolderName: string | null;
  fromSiteName: string | null; toSiteName: string | null; condition?: "ok" | "damaged";
  accessories?: number[]; issuedAccessories?: number[]; returnedAccessories?: number[]; accessoryNotes?: string;
  reason?: string; recall?: boolean; replacementRef?: string; signerName?: string; actorRole: string; at: string;
}

export function relativeUpdate(at: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(at).getTime()) / 60000));
  if (minutes < 1) return "<1min";
  if (minutes < 60) return `${minutes}min`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
  return `${Math.floor(minutes / 10080)}week`;
}

function timestamp(at: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(at));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`;
}

export function HistoryPanel({ headers, site }: { headers: Record<string, string>; site: string }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const requestHeaders = JSON.stringify(headers);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/inventory/history?site=${encodeURIComponent(site)}&offset=${offset}`, { headers: JSON.parse(requestHeaders), signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Cannot load history");
        if (!controller.signal.aborted) { setRows((previous) => offset ? [...(previous || []), ...result.transactions] : result.transactions); setHasMore(Boolean(result.hasMore)); setError(null); setLoading(false); }
      }).catch((cause) => { if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : "Cannot load history"); setLoading(false); } });
    return () => controller.abort();
  }, [requestHeaders, site, offset, retry]);
  const labels: Record<HistoryRow["type"], [string, string]> = {
    transfer: ["โอนไปไซต์", "Transferred to site"], receipt: ["ยืนยันรับเครื่องที่ไซต์", "Receipt confirmed at site"],
    issue: ["จ่ายให้คนขับ", "Issued to driver"], return: ["รับคืนจากคนขับ", "Returned from driver"], exchange: ["เปลี่ยนเครื่อง", "Exchanged"],
  };
  const groups = new Map<string, HistoryRow[]>();
  for (const row of rows || []) { const key = row.deviceId || row.deviceLabel; groups.set(key, [...(groups.get(key) || []), row]); }
  const filtered = [...groups.entries()].filter(([, events]) => events.some((row) => `${row.model} ${row.deviceLabel} ${row.fromHolderName} ${row.toHolderName} ${row.reason || ""}`.toLowerCase().includes(query.toLowerCase())));
  return <div className="space-y-3">
    <label className="block text-sm">{t("ค้นหาประวัติ", "Search history")}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("รุ่น, Device ID, คนขับ, เหตุผล", "Model, Device ID, driver, reason")} className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3" /></label>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{t(error)} <button type="button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }} className="underline">{t("ลองใหม่", "Retry")}</button></p>}
    {!rows && !error && <div role="status" className="flex gap-3 p-4 text-blue-700"><LoadingIcon />{t("กำลังอ่านประวัติ…", "Loading history…")}</div>}
    {rows && !rows.length && <p className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">{t("ยังไม่มีรายการในขอบเขตนี้", "No history in this scope yet.")}</p>}
    {rows && rows.length > 0 && !filtered.length && <p>{t("ไม่พบประวัติที่ค้นหาในรายการที่โหลดแล้ว", "No matching history in loaded records.")}</p>}
    {filtered.map(([id, events]) => { const latest = events[0]; return <details key={id} className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="min-h-11 cursor-pointer space-y-1 break-words"><strong>{latest.model || t("ไม่ระบุรุ่น", "Model not specified")}</strong><span className="ml-2 text-sm text-blue-700">{latest.deviceLabel}</span><span className="block text-xs text-slate-500">{t("อัปเดตล่าสุด", "Last update")} {relativeUpdate(latest.at, now)} <time dateTime={latest.at}>({timestamp(latest.at)})</time> · {events.length} {t("ธุรกรรม", "transaction(s)")}</span></summary>
      <ol className="mt-4 space-y-3 border-t border-slate-100 pt-4">{events.map((row) => <li key={row.id} className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
        <p className="font-semibold">{row.recall ? t("เรียกคืนโทรศัพท์", "Phone recalled") : t(...labels[row.type])}{row.replacementRef && ` · ${t("เปลี่ยนเครื่อง", "Exchange")}`}</p>
        <p>{row.fromHolderName || row.fromSiteName || "—"} → {row.toHolderName || row.toSiteName || "—"}</p>
        <p className="text-xs text-slate-500"><time dateTime={row.at}>{timestamp(row.at)}</time> · {row.actorRole}</p>
        {row.condition && <p>{t("สภาพ", "Condition")}: {row.condition === "damaged" ? t("เสียหาย — ห้ามจ่ายต่อ", "Damaged — unavailable for issue") : t("ปกติ", "OK")}</p>}
        {row.type === "issue" && <AccessorySummary issued={row.accessories} />}
        {row.type === "return" && <AccessorySummary issued={row.issuedAccessories} returned={row.returnedAccessories} notes={row.accessoryNotes} />}
        {row.reason && <p className="whitespace-pre-wrap break-words">{t("เหตุผล / หมายเหตุ", "Reason / notes")}: {row.reason}</p>}
        {(row.signerName || row.type === "issue") && <p>{t("ผู้เซ็นรับ · คนขับ", "Receipt signed by · Driver")}: {row.signerName || row.toHolderName || "—"}</p>}
        {row.replacementRef && <p className="break-all text-xs text-slate-500">{t("อ้างอิงการเปลี่ยนเครื่อง", "Exchange reference")}: {row.replacementRef}</p>}
        <p className="break-all text-xs text-slate-400">{t("เลขธุรกรรม", "Transaction ID")}: {row.id}</p>
      </li>)}</ol>
    </details>; })}
    {hasMore && <button type="button" disabled={loading} onClick={() => { setLoading(true); setOffset(rows?.length || 0); }} className="min-h-11 rounded-lg border bg-white px-4 text-sm">{loading ? t("กำลังโหลด…", "Loading…") : t("โหลดประวัติเพิ่ม", "Load more history")}</button>}
    {rows && rows.length > 0 && <p className="text-xs text-slate-400">{t("เวลาแสดงตามประเทศไทย (UTC+7) · ค้นหาในรายการที่โหลดแล้ว", "Times in Thailand (UTC+7) · Search covers loaded records")}</p>}
  </div>;
}
