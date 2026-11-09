"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/shared/LanguageProvider";
import { BrandIcon, type BrandIconName } from "@/components/shared/BrandIcon";
import { WORKFLOW_ROLES } from "@/lib/workflow-structure";
import { AccessorySummary } from "./AccessorySummary";
import { LoadingIcon } from "./LoadingIcon";

interface HistoryRow {
  id: string; deviceId: string; type: "transfer" | "receipt" | "issue" | "return" | "exchange";
  model?: string; deviceLabel: string; fromHolderName: string | null; toHolderName: string | null;
  fromSiteName: string | null; toSiteName: string | null; condition?: "ok" | "damaged";
  accessories?: number[]; issuedAccessories?: number[]; returnedAccessories?: number[]; accessoryNotes?: string;
  reason?: string; recall?: boolean; replacementRef?: string; signerName?: string; actorRole: string; at: string;
}
const actions: Record<HistoryRow["type"], { th: string; en: string; icon: BrandIconName; color: string }> = {
  transfer: { th: "โอนไปไซต์", en: "Transferred to site", icon: "transfer", color: "bg-violet-50 text-violet-800" },
  receipt: { th: "ยืนยันรับเครื่องที่ไซต์", en: "Receipt confirmed at site", icon: "receipt", color: "bg-teal-50 text-teal-800" },
  issue: { th: "จ่ายให้คนขับ", en: "Issued to driver", icon: "phone", color: "bg-blue-50 text-blue-800" },
  return: { th: "รับคืนจากคนขับ", en: "Returned from driver", icon: "return", color: "bg-emerald-50 text-emerald-800" },
  exchange: { th: "เปลี่ยนเครื่อง", en: "Exchanged", icon: "exchange", color: "bg-indigo-50 text-indigo-800" },
};
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

function TransactionCard({ row, showDevice = false }: { row: HistoryRow; showDevice?: boolean }) {
  const { language, t } = useLanguage();
  const action = actions[row.type];
  const actor = WORKFLOW_ROLES[row.actorRole as keyof typeof WORKFLOW_ROLES]?.[language] || row.actorRole;
  return <article className="overflow-hidden rounded-xl border border-slate-200 bg-white" data-transaction-id={row.id}>
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div className="flex items-start gap-3"><span className={`rounded-xl p-2 ${action.color}`}><BrandIcon name={action.icon} size={24} /></span><div><h3 className="text-sm font-semibold leading-6">{row.recall ? t("เรียกคืนโทรศัพท์", "Phone recalled") : t(action.th, action.en)}</h3>{row.replacementRef && <p className="mt-1 text-xs font-medium text-indigo-700">{t("เป็นส่วนหนึ่งของการเปลี่ยนเครื่อง", "Part of an exchange")}</p>}{showDevice && <p className="mt-2 break-words text-sm text-slate-500">{row.model || t("ไม่ระบุรุ่น", "Model not specified")}<span className="mt-1 block break-all font-mono text-xs text-blue-700">{row.deviceLabel}</span></p>}</div></div><time dateTime={row.at} className="text-xs leading-5 text-slate-500">{timestamp(row.at)}</time></div>
    <div className="space-y-4 p-4 sm:p-5"><dl className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{t("จาก", "From")}</dt><dd className="mt-2 break-words text-sm font-medium leading-6">{row.fromHolderName || row.fromSiteName || (["issue", "transfer"].includes(row.type) ? t("สต็อกส่วนกลาง", "Central stock") : "—")}</dd>{row.fromHolderName && row.fromSiteName && <dd className="mt-1 text-xs text-slate-500">{row.fromSiteName}</dd>}</div><div className="rounded-xl bg-blue-50/60 p-3"><dt className="text-[11px] font-medium uppercase tracking-wide text-blue-500">{t("ถึง", "To")}</dt><dd className="mt-2 break-words text-sm font-medium leading-6">{row.toHolderName || row.toSiteName || "—"}</dd>{row.toHolderName && row.toSiteName && <dd className="mt-1 text-xs text-slate-500">{row.toSiteName}</dd>}</div></dl>
      <div className="flex flex-wrap items-center gap-3 text-xs"><span className="text-slate-500">{t("บันทึกโดย", "Recorded by")}: <strong className="font-medium text-slate-700">{actor}</strong></span>{row.condition && <span className={`rounded-full px-2.5 py-1 font-medium ${row.condition === "damaged" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>{t("สภาพ", "Condition")}: {row.condition === "damaged" ? t("เสียหาย — ห้ามจ่ายต่อ", "Damaged — unavailable for issue") : t("ปกติ", "OK")}</span>}</div>
      {row.reason && <p className="whitespace-pre-wrap break-words rounded-xl border-l-4 border-amber-300 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{t("เหตุผล / หมายเหตุ", "Reason / notes")}: {row.reason}</p>}
      {row.type === "issue" && <AccessorySummary issued={row.accessories} />}
      {row.type === "return" && <AccessorySummary issued={row.issuedAccessories} returned={row.returnedAccessories} notes={row.accessoryNotes} />}
      {(row.signerName || row.type === "issue") && <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{t("ผู้เซ็นรับ · คนขับ", "Receipt signed by · Driver")}: {row.signerName || row.toHolderName || "—"}</p>}
    </div><dl className="grid gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-[11px] text-slate-400 sm:grid-cols-2 sm:px-5"><div><dt>{t("เลขธุรกรรม", "Transaction ID")}</dt><dd className="mt-1 break-all font-mono">{row.id}</dd></div>{row.replacementRef && <div><dt>{t("อ้างอิงการเปลี่ยนเครื่อง", "Exchange reference")}</dt><dd className="mt-1 break-all font-mono">{row.replacementRef}</dd></div>}</dl>
  </article>;
}

export function HistoryPanel({ headers, site, deviceId }: { headers: Record<string, string>; site: string; deviceId?: string }) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState<"devices" | "timeline">("devices");
  const [now, setNow] = useState(() => Date.now());
  const requestHeaders = JSON.stringify(headers);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/inventory/history?site=${encodeURIComponent(site)}&offset=${offset}${deviceId ? `&device=${encodeURIComponent(deviceId)}` : ""}`, { headers: JSON.parse(requestHeaders), signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Cannot load history");
        if (!controller.signal.aborted) { setRows((previous) => offset ? [...(previous || []), ...result.transactions] : result.transactions); setHasMore(Boolean(result.hasMore)); setError(null); setLoading(false); }
      }).catch((cause) => { if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : "Cannot load history"); setLoading(false); } });
    return () => controller.abort();
  }, [requestHeaders, site, deviceId, offset, retry]);
  const filtered = (rows || []).filter((row) => (typeFilter === "all" || (typeFilter === "recall" ? row.recall : typeFilter === "exchange" ? row.type === "exchange" || row.replacementRef : row.type === typeFilter)) && `${row.model || ""} ${row.deviceLabel} ${row.fromHolderName || ""} ${row.toHolderName || ""} ${row.fromSiteName || ""} ${row.toSiteName || ""} ${row.reason || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = new Map<string, HistoryRow[]>();
  for (const row of filtered) { const key = row.deviceId || row.deviceLabel; groups.set(key, [...(groups.get(key) || []), row]); }
  return <div className="space-y-5">
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-700">{t("ติดตามการเคลื่อนไหว", "Track movements")}</p><p className="mt-1 text-xs leading-5 text-slate-500">{t("เลือกดูตามเครื่อง หรือเรียงเป็น timeline จากรายการล่าสุด", "Group by phone, or follow a timeline with the latest movement first.")}</p></div><div role="group" aria-label={t("มุมมองประวัติ", "History view")} className="flex gap-1 rounded-xl bg-slate-100 p-1">{(["devices", "timeline"] as const).map((id) => <button type="button" key={id} aria-pressed={view === id} onClick={() => setView(id)} className={`min-h-10 rounded-lg px-3 text-xs font-medium ${view === id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}>{id === "devices" ? t("แยกตามเครื่อง", "By phone") : t("ลำดับเหตุการณ์", "Timeline")}</button>)}</div></div><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><label className="block text-xs text-slate-500">{t("ค้นหาประวัติ", "Search history")}<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("รุ่น, Device ID, คนขับ, เหตุผล", "Model, Device ID, driver, reason")} className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" /></label><label className="block text-xs text-slate-500">{t("ประเภทรายการ", "Movement type")}<select aria-label={t("กรองประเภทธุรกรรม", "Filter movement type")} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value="all">{t("ทุกธุรกรรม", "All movements")}</option>{Object.entries(actions).map(([id, action]) => <option key={id} value={id}>{t(action.th, action.en)}</option>)}<option value="recall">{t("เรียกคืนโทรศัพท์", "Phone recalled")}</option></select></label></div><p className="text-xs text-slate-400">{t(`${groups.size} เครื่อง · ${filtered.length} ธุรกรรมที่โหลดแล้ว`, `${groups.size} phones · ${filtered.length} loaded transactions`)}</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{t(error)} <button type="button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }} className="underline">{t("ลองใหม่", "Retry")}</button></p>}
    {!rows && !error && <div role="status" className="flex gap-3 p-4 text-blue-700"><LoadingIcon />{t("กำลังอ่านประวัติ…", "Loading history…")}</div>}
    {rows && !rows.length && <p className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">{t("ยังไม่มีรายการในขอบเขตนี้", "No history in this scope yet.")}</p>}
    {rows && rows.length > 0 && !filtered.length && <p className="rounded-xl border bg-white p-6 text-sm text-slate-500">{t("ไม่พบประวัติที่ค้นหาในรายการที่โหลดแล้ว", "No matching history in loaded records.")}</p>}
    {view === "devices" ? [...groups.entries()].map(([id, events]) => { const latest = events[0], action = actions[latest.type]; return <details key={id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="list-none cursor-pointer p-5 [&::-webkit-details-marker]:hidden"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="rounded-xl bg-slate-50 p-2.5"><BrandIcon name="phone" size={30} /></span><div className="min-w-0"><strong className="block break-words text-base">{latest.model || t("ไม่ระบุรุ่น", "Model not specified")}</strong><span className="mt-1 block break-all font-mono text-xs text-blue-700">{latest.deviceLabel}</span></div></div><span className={`rounded-full px-3 py-1.5 text-xs font-medium ${action.color}`}>{latest.recall ? t("เรียกคืนโทรศัพท์", "Phone recalled") : t(action.th, action.en)}</span></div><dl className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2"><div><dt className="text-[11px] text-slate-400">{t("จาก", "From")}</dt><dd className="mt-1 break-words text-sm font-medium">{latest.fromHolderName || latest.fromSiteName || "—"}</dd></div><div><dt className="text-[11px] text-slate-400">{t("ถึง", "To")}</dt><dd className="mt-1 break-words text-sm font-medium">{latest.toHolderName || latest.toSiteName || "—"}</dd></div></dl><div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div className="text-xs leading-6 text-slate-500"><p>{t("อัปเดตล่าสุด", "Last update")} {relativeUpdate(latest.at, now)}</p><time dateTime={latest.at}>({timestamp(latest.at)})</time></div><span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700"><span className="group-open:hidden">{t("ขยาย", "Expand")}</span><span className="hidden group-open:inline">{t("ย่อ", "Collapse")}</span> · {events.length} {t("ธุรกรรม", "transaction(s)")}</span></div></summary>
      <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5"><ol className="space-y-5 border-l-2 border-blue-100 pl-4 sm:pl-5">{events.map((row) => <li key={row.id} className="relative before:absolute before:-left-[23px] before:top-6 before:h-3 before:w-3 before:rounded-full before:border-2 before:border-white before:bg-blue-500 sm:before:-left-[27px]"><TransactionCard row={row} /></li>)}</ol></div>
    </details>; }) : <ol className="space-y-5 border-l-2 border-blue-100 pl-4">{filtered.map((row) => <li key={row.id} className="relative before:absolute before:-left-[23px] before:top-6 before:h-3 before:w-3 before:rounded-full before:border-2 before:border-white before:bg-blue-500"><TransactionCard row={row} showDevice /></li>)}</ol>}
    {hasMore && <button type="button" disabled={loading} onClick={() => { setLoading(true); setOffset(rows?.length || 0); }} className="min-h-11 rounded-lg border bg-white px-4 text-sm">{loading ? t("กำลังโหลด…", "Loading…") : t("โหลดประวัติเพิ่ม", "Load more history")}</button>}
    {rows && rows.length > 0 && <p className="text-xs leading-5 text-slate-400">{t("เวลาแสดงตามประเทศไทย (UTC+7) · ค้นหาในรายการที่โหลดแล้ว", "Times in Thailand (UTC+7) · Search covers loaded records")}</p>}
  </div>;
}
