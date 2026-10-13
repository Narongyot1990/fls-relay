"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Smartphone } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import { DEVICE_FIELD_CATALOG } from "@/lib/device-model-fields";
import type { DeviceModel } from "@/types";

export default function ManageModelsPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [models, setModels] = useState<DeviceModel[] | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadModels() {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => setModels(data.models ?? []));
  }

  useEffect(() => {
    loadModels();
  }, []);

  async function handleToggleActive(model: DeviceModel) {
    setBusyId(model.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "PATCH",
        headers: userHeaders(user),
        body: JSON.stringify({ active: !model.active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRowError({ id: model.id, message: data.error ?? "Could not update model" });
        return;
      }
      loadModels();
    } catch {
      setRowError({ id: model.id, message: "Network error — try again" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(model: DeviceModel) {
    if (!window.confirm(`Delete "${model.name}"? This can't be undone.`)) return;
    setBusyId(model.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "DELETE",
        headers: userHeaders(user),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRowError({ id: model.id, message: data.error ?? "Could not delete model" });
        return;
      }
      loadModels();
    } catch {
      setRowError({ id: model.id, message: "Network error — try again" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <RequireLevel allow={["L1"]}>
      <div className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="flex-1 text-base font-semibold text-neutral-900">Manage phone models</h1>
          <Link
            href="/admin/models/new"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Add model"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          <p className="text-sm font-medium text-neutral-500">
            {models === null ? "Loading…" : `${models.length} models`}
          </p>

          {models !== null && models.length === 0 ? (
            <EmptyState
              icon={Smartphone}
              message="No phone models yet"
              action={
                <Link href="/admin/models/new" className="text-sm font-medium text-neutral-900 underline">
                  Add the first model
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {(models ?? []).map((m) => (
                <div key={m.id} className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {m.images.length > 0 && (
                        // eslint-disable-next-line @next/next/no-img-element -- remote blob URL, not worth Next/Image config for a small list thumbnail
                        <img
                          src={m.images[0].url}
                          alt={m.images[0].description}
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium text-neutral-900">{m.name}</p>
                        <p className="mt-0.5 truncate text-sm text-neutral-500">
                          <span className={m.active ? "text-emerald-600" : "text-neutral-400"}>
                            {m.active ? "Active" : "Inactive"}
                          </span>
                          {m.fieldKeys.length > 0 &&
                            ` · ${m.fieldKeys
                              .map((k) => DEVICE_FIELD_CATALOG.find((f) => f.key === k)?.label ?? k)
                              .join(", ")}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Link
                        href={`/admin/models/${m.id}/photos`}
                        className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
                      >
                        Photos{m.images.length > 0 ? ` (${m.images.length})` : ""}
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => handleToggleActive(m)}
                        className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 disabled:opacity-40"
                      >
                        {m.active ? "Deactivate" : "Reactivate"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === m.id}
                        onClick={() => handleDelete(m)}
                        className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-600 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {rowError?.id === m.id && <p className="mt-2 text-sm text-red-600">{rowError.message}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequireLevel>
  );
}
