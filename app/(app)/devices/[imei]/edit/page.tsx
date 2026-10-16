"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import type { Device } from "@/types";

export default function EditDevicePage() {
  const router = useRouter();
  const params = useParams<{ imei: string }>();
  const { user } = useCurrentUser();
  const [device, setDevice] = useState<Device | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [imei, setImei] = useState("");
  const [serial, setSerial] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/devices/${params.imei}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data?.device) return;
        const d: Device = data.device;
        setDevice(d);
        setImei(d.imei);
        setSerial(d.serial);
        setPhoneNumber(d.phoneNumber);
      });
  }, [params.imei]);

  const canSubmit = imei.trim() !== "" && serial.trim() !== "";

  async function handleSubmit() {
    if (!device || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${device.imei}`, {
        method: "PATCH",
        headers: userHeaders(user),
        body: JSON.stringify({ imei: imei.trim(), serial: serial.trim(), phoneNumber: phoneNumber.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save changes");
        return;
      }
      router.push(`/devices/${imei.trim()}`);
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-neutral-600">Device not found</p>
        <button
          type="button"
          onClick={() => router.push("/devices")}
          className="text-sm font-medium text-neutral-900 underline"
        >
          Back to phones
        </button>
      </div>
    );
  }

  return (
    <RequireLevel allow={["L1"]}>
      <div className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push(device ? `/devices/${device.imei}` : "/devices")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold text-neutral-900">Edit device info</h1>
        </div>

        {device === null ? (
          <p className="px-4 py-5 text-sm text-neutral-500">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">IMEI</span>
              <input
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
                inputMode="numeric"
                autoFocus
              />
              {imei.startsWith("PENDING-") && (
                <span className="text-xs text-amber-600">
                  This is a placeholder from a CSV import — replace it with the real IMEI.
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">Serial number</span>
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">Phone number</span>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="089-000-0000"
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              disabled={submitting || !canSubmit}
              onClick={handleSubmit}
              className="mt-2 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </RequireLevel>
  );
}
