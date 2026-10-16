"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import type { Device, Site } from "@/types";

export default function AssignDeviceSitePage() {
  const router = useRouter();
  const params = useParams<{ imei: string }>();
  const { user } = useCurrentUser();
  const [device, setDevice] = useState<Device | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/devices/${params.imei}`)
      .then((r) => r.json())
      .then((data) => setDevice(data.device ?? null));
    fetch("/api/sites?activeOnly=1")
      .then((r) => r.json())
      .then((data) => {
        setSites(data.sites ?? []);
        setSiteId((prev) => prev || data.sites?.[0]?.id || "");
      });
  }, [params.imei]);

  async function handleSubmit() {
    if (!siteId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${params.imei}/assign-site`, {
        method: "POST",
        headers: userHeaders(user),
        body: JSON.stringify({ siteId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not assign this device");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  const siteName = sites.find((s) => s.id === siteId)?.name ?? "";

  if (submitted) {
    return (
      <RequireLevel allow={["L3", "L4"]}>
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-semibold text-neutral-900">Now in stock at {siteName}</p>
            <p className="mt-1 text-sm text-neutral-600">That site&apos;s leader can see it right away.</p>
          </div>
          <Link
            href={`/devices/${params.imei}`}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white"
          >
            Back to device
          </Link>
        </div>
      </RequireLevel>
    );
  }

  return (
    <RequireLevel allow={["L3", "L4"]}>
      <div className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push(`/devices/${params.imei}`)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold text-neutral-900">Assign to a site</h1>
        </div>

        {device === null ? (
          <p className="px-4 py-5 text-sm text-neutral-500">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-5">
            <p className="text-sm text-neutral-600">{device.model}</p>

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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              disabled={submitting || !siteId}
              onClick={handleSubmit}
              className="mt-2 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
            >
              {submitting ? "Assigning…" : "Assign"}
            </button>
          </div>
        )}
      </div>
    </RequireLevel>
  );
}
