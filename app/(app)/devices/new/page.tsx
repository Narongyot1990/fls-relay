"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import type { Site } from "@/types";

const MODELS = ["Samsung Galaxy A07", "Samsung Galaxy A15", "iPhone SE"];

export default function RegisterDevicePage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [serial, setSerial] = useState("");
  const [imei, setImei] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        setSites(data.sites ?? []);
        setSiteId((prev) => prev || data.sites?.[0]?.id || "");
      });
  }, []);

  const canSubmit =
    !submitting &&
    siteId !== "" &&
    serial.trim() !== "" &&
    imei.trim().length >= 6 &&
    phoneNumber.trim() !== "";

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: userHeaders(user),
        body: JSON.stringify({ imei, serial, model, phoneNumber, siteId }),
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
            <p className="mt-1 text-sm text-neutral-600">{model} is now in the register</p>
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
          <h1 className="text-base font-semibold text-neutral-900">Register a device</h1>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Site</span>
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
            <span className="text-sm font-medium text-neutral-800">Model</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="min-h-[48px] rounded-xl border border-neutral-300 bg-white px-3 text-base"
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="mt-2 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
          >
            {submitting ? "Registering…" : "Register device"}
          </button>
        </div>
      </div>
    </RequireLevel>
  );
}
