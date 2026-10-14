"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Smartphone } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { StatusBadge } from "@/components/device/StatusBadge";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import { last4 } from "@/lib/codes";
import type { Device, Holder, Site } from "@/types";

const TYPE_LABELS: Record<Holder["type"], string> = {
  driver: "Driver",
  site_leader: "Site Leader",
};

export default function HolderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useCurrentUser();
  const [holder, setHolder] = useState<Holder | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHolder = useCallback(() => {
    fetch("/api/holders?includeInactive=1")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.holders ?? []).find((h: Holder) => h.id === params.id);
        if (!found) {
          setNotFound(true);
          return;
        }
        setHolder(found);
        fetch(`/api/devices?holderId=${found.id}`)
          .then((r) => r.json())
          .then((d) => setDevices(d.devices ?? []));
        fetch("/api/sites")
          .then((r) => r.json())
          .then((d) => setSite((d.sites ?? []).find((s: Site) => s.id === found.siteId) ?? null));
      });
  }, [params.id]);

  useEffect(() => {
    loadHolder();
  }, [loadHolder]);

  async function handleToggleActive() {
    if (!holder) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/holders/${holder.id}`, {
        method: "PATCH",
        headers: userHeaders(user),
        body: JSON.stringify({ active: !holder.active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not update person");
        return;
      }
      loadHolder();
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!holder) return;
    if (!window.confirm(`Delete "${holder.name}"? This can't be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/holders/${holder.id}`, {
        method: "DELETE",
        headers: userHeaders(user),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete person");
        return;
      }
      router.push("/admin/holders");
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-neutral-600">Person not found</p>
        <Link href="/admin/holders" className="text-sm font-medium text-neutral-900 underline">
          Back to people
        </Link>
      </div>
    );
  }

  const holdingLabel = holder?.type === "driver" ? "Currently holding" : "Personally holding";

  return (
    <RequireLevel allow={["L1", "L4"]}>
      <div className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/admin/holders")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="truncate text-base font-semibold text-neutral-900">{holder ? holder.name : "Person"}</h1>
        </div>

        {holder === null ? (
          <p className="px-4 py-5 text-sm text-neutral-500">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-5">
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <span className={`text-sm font-medium ${holder.active ? "text-emerald-600" : "text-neutral-400"}`}>
                {holder.active ? "Active" : "Inactive"}
              </span>
              <p className="mt-1 text-sm text-neutral-700">
                {TYPE_LABELS[holder.type]} · {holder.employeeNo}
              </p>
              <p className="text-sm text-neutral-600">{site ? site.name : "No site"}</p>
              <p className="text-sm text-neutral-600">{holder.phone}</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-neutral-800">{holdingLabel}</p>
              {devices === null ? (
                <p className="text-sm text-neutral-500">Loading…</p>
              ) : devices.length === 0 ? (
                <p className="text-sm text-neutral-500">Not holding any device right now.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {devices.map((d) => (
                    <Link
                      key={d.id}
                      href={`/devices/${d.imei}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 active:bg-neutral-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                          <Smartphone className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-900">{d.model}</p>
                          <StatusBadge status={d.status} />
                        </div>
                      </div>
                      <span className="shrink-0 text-sm text-neutral-500">····{last4(d.imei)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={handleToggleActive}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-neutral-300 text-base font-medium text-neutral-700 disabled:opacity-40"
              >
                {holder.active ? "Deactivate person" : "Reactivate person"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDelete}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-red-200 text-base font-medium text-red-600 disabled:opacity-40"
              >
                Delete person
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </RequireLevel>
  );
}
