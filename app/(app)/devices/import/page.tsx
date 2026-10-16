"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import { parseCsv, findColumn, type ParsedCsv } from "@/lib/csv";
import type { DeviceModel, Site } from "@/types";

interface ImportResult {
  created: { id: string }[];
  failed: { serial: string; message: string }[];
}

export default function ImportDevicesPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [sites, setSites] = useState<Site[]>([]);
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [siteId, setSiteId] = useState("");

  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serialCol, setSerialCol] = useState<string | null>(null);
  const [modelCol, setModelCol] = useState<string | null>(null);
  const [nameCol, setNameCol] = useState<string | null>(null);
  const [modelMapping, setModelMapping] = useState<Record<string, string>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    fetch("/api/sites?activeOnly=1")
      .then((r) => r.json())
      .then((data) => {
        setSites(data.sites ?? []);
        setSiteId((prev) => prev || data.sites?.[0]?.id || "");
      });
    fetch("/api/models?activeOnly=1")
      .then((r) => r.json())
      .then((data) => setModels(data.models ?? []));
  }, []);

  function handleFile(file: File) {
    setFileError(null);
    setResult(null);
    file
      .text()
      .then((text) => {
        const csv = parseCsv(text);
        const serial = findColumn(csv.headers, ["serial number", "serial"]);
        const model = findColumn(csv.headers, ["model"]);
        const name = findColumn(csv.headers, ["device name", "name"]);
        if (!serial || !model) {
          setFileError('Couldn\'t find a "Serial number" and "Model" column in this file.');
          setParsed(null);
          return;
        }
        setSerialCol(serial);
        setModelCol(model);
        setNameCol(name);
        setParsed(csv);

        const distinctRawModels = Array.from(new Set(csv.rows.map((r) => r[model]).filter(Boolean)));
        setModelMapping(Object.fromEntries(distinctRawModels.map((m) => [m, ""])));
      })
      .catch(() => setFileError("Could not read that file"));
  }

  const distinctRawModels = modelCol && parsed ? Array.from(new Set(parsed.rows.map((r) => r[modelCol]).filter(Boolean))) : [];

  const mappedRows =
    parsed && serialCol && modelCol
      ? parsed.rows
          .map((r) => ({
            serial: r[serialCol] ?? "",
            name: nameCol ? r[nameCol] ?? "" : "",
            rawModel: r[modelCol] ?? "",
            mappedModel: modelMapping[r[modelCol]] ?? "",
          }))
          .filter((r) => r.serial)
      : [];

  const readyRows = mappedRows.filter((r) => r.mappedModel);
  const skippedCount = mappedRows.length - readyRows.length;

  async function handleSubmit() {
    if (!siteId || readyRows.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/devices/import", {
        method: "POST",
        headers: userHeaders(user),
        body: JSON.stringify({
          siteId,
          rows: readyRows.map((r) => ({ serial: r.serial, model: r.mappedModel })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not import devices");
        return;
      }
      setResult(data);
    } catch {
      setSubmitError("Network error — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <RequireLevel allow={["L1"]}>
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-semibold text-neutral-900">{result.created.length} device(s) imported</p>
            <p className="mt-1 text-sm text-neutral-600">
              They&apos;re registered with a placeholder IMEI — edit each one to fill in the real IMEI
              and phone number.
            </p>
          </div>

          {(result.failed.length > 0 || skippedCount > 0) && (
            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-900">
              {skippedCount > 0 && <p>{skippedCount} row(s) skipped — no model mapping chosen.</p>}
              {result.failed.map((f) => (
                <p key={f.serial}>
                  {f.serial}: {f.message}
                </p>
              ))}
            </div>
          )}

          <Link
            href="/devices"
            className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white"
          >
            View all phones
          </Link>
        </div>
      </RequireLevel>
    );
  }

  return (
    <RequireLevel allow={["L1"]}>
      <div className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/devices/new")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold text-neutral-900">Import devices from CSV</h1>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          <p className="text-sm text-neutral-500">
            For MDM export files with no IMEI or phone number yet — devices are created with a
            placeholder IMEI you fill in later, one at a time.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Site (applies to the whole file)</span>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="min-h-[48px] rounded-xl border border-neutral-300 bg-white px-3 text-base"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="text-sm text-neutral-700"
            />
            {fileError && <span className="text-sm text-red-600">{fileError}</span>}
          </label>

          {parsed && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-800">
                  Map each model code found in the file to a model in your catalog
                </p>
                <div className="flex flex-col gap-2">
                  {distinctRawModels.map((raw) => (
                    <div key={raw} className="flex items-center gap-2">
                      <span className="w-1/2 truncate text-sm text-neutral-700">{raw}</span>
                      <select
                        value={modelMapping[raw] ?? ""}
                        onChange={(e) => setModelMapping((prev) => ({ ...prev, [raw]: e.target.value }))}
                        className="min-h-[44px] flex-1 rounded-xl border border-neutral-300 bg-white px-2 text-sm"
                      >
                        <option value="">Skip this model</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-neutral-500">
                  {readyRows.length} of {mappedRows.length} rows ready to import
                  {skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}
                </p>
                <div className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-3">
                  {mappedRows.slice(0, 8).map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate text-neutral-700">
                        {r.serial}
                        {r.name ? ` · ${r.name}` : ""}
                      </span>
                      <span className={`shrink-0 ${r.mappedModel ? "text-neutral-500" : "text-amber-600"}`}>
                        {r.mappedModel || "skip"}
                      </span>
                    </div>
                  ))}
                  {mappedRows.length > 8 && (
                    <p className="text-sm text-neutral-400">…and {mappedRows.length - 8} more</p>
                  )}
                </div>
              </div>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}

              <button
                type="button"
                disabled={submitting || !siteId || readyRows.length === 0}
                onClick={handleSubmit}
                className="mt-2 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
              >
                {submitting ? "Importing…" : `Import ${readyRows.length} device(s)`}
              </button>
            </>
          )}
        </div>
      </div>
    </RequireLevel>
  );
}
