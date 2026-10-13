"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/current-user";
import { canRegisterDevices, canRetireDevices } from "@/lib/permissions";
import { userHeaders } from "@/lib/api-client";
import type { DeviceStatus } from "@/types";

interface DeviceActionsProps {
  imei: string;
  status: DeviceStatus;
  hasHolder: boolean;
}

export function DeviceActions({ imei, status, hasHolder }: DeviceActionsProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = canRegisterDevices(user.level) && status === "registered" && !hasHolder;
  const canRetire = canRetireDevices(user.level) && (status === "in_site_stock" || status === "returned");

  if (!canDelete && !canRetire) return null;

  async function handleRetire() {
    if (!window.confirm("Retire this device? It leaves active rotation but stays in the register.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${imei}/retire`, {
        method: "POST",
        headers: userHeaders(user),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not retire device");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this device? This can't be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${imei}`, {
        method: "DELETE",
        headers: userHeaders(user),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete device");
        return;
      }
      router.push("/devices");
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <h2 className="mb-2 text-sm font-semibold text-red-900">Danger zone</h2>
      <div className="flex gap-2">
        {canRetire && (
          <button
            type="button"
            disabled={busy}
            onClick={handleRetire}
            className="flex-1 rounded-full border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-40"
          >
            Retire device
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            disabled={busy}
            onClick={handleDelete}
            className="flex-1 rounded-full bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Delete device
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
