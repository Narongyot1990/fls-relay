"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import { DEVICE_FIELD_CATALOG } from "@/lib/device-model-fields";
import type { DeviceModel } from "@/types";

export default function RegisterDevicePage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [modelName, setModelName] = useState("");
  const [serial, setSerial] = useState("");
  const [imei, setImei] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/models?activeOnly=1")
      .then((r) => r.json())
      .then((data) => {
        setModels(data.models ?? []);
        setModelName((prev) => prev || data.models?.[0]?.name || "");
      });
  }, []);

  const selectedModel = models.find((m) => m.name === modelName);

  function setCustomField(key: string, value: string) {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
  }

  const missingReason =
    modelName.trim() === ""
      ? "Select a model"
      : serial.trim() === ""
        ? "Enter the serial number"
        : imei.trim().length < 6
          ? "Enter a valid IMEI"
          : phoneNumber.trim() === ""
            ? "Enter the phone number"
            : null;

  const canSubmit = !submitting && missingReason === null;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: userHeaders(user),
        body: JSON.stringify({
          imei,
          serial,
          model: modelName,
          phoneNumber,
          customFields,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not register device");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <RequireLevel allow={["L1"]}>
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-semibold text-neutral-900">Device registered</p>
            <p className="mt-1 text-sm text-neutral-600">
              {modelName} is in the register, not yet at a site — an Ops Supervisor or Management
              will issue it to one.
            </p>
          </div>
          <Link
            href="/"
            className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white"
          >
            Back to home
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
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="flex-1 text-base font-semibold text-neutral-900">Register a device</h1>
          <Link href="/devices/import" className="px-1 text-sm font-medium text-neutral-900 underline">
            Import CSV
          </Link>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Model</span>
            {models.length > 0 ? (
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                className="min-h-[48px] rounded-xl border border-neutral-300 bg-white px-3 text-base"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-xl border border-dashed border-neutral-300 px-3 py-3 text-sm text-neutral-500">
                No phone models yet.
              </p>
            )}
            <Link href="/admin/models" className="text-sm font-medium text-neutral-900 underline">
              + Add a new model
            </Link>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Serial number</span>
            <input
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              placeholder="e.g. SNA15-0999"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">IMEI</span>
            <input
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              placeholder="15-digit IMEI"
              inputMode="numeric"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Phone number</span>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              placeholder="089-000-0000"
            />
          </label>

          {selectedModel && selectedModel.fieldKeys.length > 0 && (
            <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-sm font-medium text-neutral-800">{selectedModel.name} details</p>
              {selectedModel.fieldKeys.map((key) => {
                const field = DEVICE_FIELD_CATALOG.find((f) => f.key === key);
                if (!field) return null;
                return (
                  <label key={key} className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-neutral-800">{field.label}</span>
                    {field.inputType === "select" ? (
                      <select
                        value={customFields[key] ?? ""}
                        onChange={(e) => setCustomField(key, e.target.value)}
                        className="min-h-[48px] rounded-xl border border-neutral-300 bg-white px-3 text-base"
                      >
                        <option value="">Select…</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.inputType === "date" ? "date" : "text"}
                        value={customFields[key] ?? ""}
                        onChange={(e) => setCustomField(key, e.target.value)}
                        placeholder={field.placeholder}
                        className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
                      />
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="mt-2 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
          >
            {submitting ? "Registering…" : "Register device"}
          </button>
          {!submitting && missingReason && (
            <p className="text-center text-sm text-neutral-500">{missingReason}</p>
          )}
        </div>
      </div>
    </RequireLevel>
  );
}
