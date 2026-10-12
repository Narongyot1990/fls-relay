"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";

const MODELS = ["Samsung Galaxy A07", "Samsung Galaxy A15", "iPhone SE"];

export default function RegisterDevicePage() {
  const router = useRouter();
  const [model, setModel] = useState(MODELS[0]);
  const [serial, setSerial] = useState("");
  const [imei, setImei] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = serial.trim() !== "" && imei.trim().length >= 6 && phoneNumber.trim() !== "";

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

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => setSubmitted(true)}
            className="mt-2 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
          >
            Register device
          </button>
        </div>
      </div>
    </RequireLevel>
  );
}
