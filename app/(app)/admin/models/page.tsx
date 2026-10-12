"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import { DEVICE_FIELD_CATALOG } from "@/lib/device-model-fields";
import type { DeviceModel } from "@/types";

export default function ManageModelsPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [models, setModels] = useState<DeviceModel[] | null>(null);
  const [name, setName] = useState("");
  const [fieldKeys, setFieldKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  function toggleField(key: string) {
    setFieldKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleAdd() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: userHeaders(user),
        body: JSON.stringify({ name: name.trim(), fieldKeys }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not create model");
        return;
      }
      setName("");
      setFieldKeys([]);
      loadModels();
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

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
          <h1 className="text-base font-semibold text-neutral-900">Manage phone models</h1>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">Model name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Samsung Galaxy A16"
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-medium text-neutral-800">
                Extra fields to collect when registering this model
              </p>
              <div className="flex flex-col gap-2">
                {DEVICE_FIELD_CATALOG.map((f) => (
                  <label key={f.key} className="flex items-center gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={fieldKeys.includes(f.key)}
                      onChange={() => toggleField(f.key)}
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={submitting || !name.trim()}
              onClick={handleAdd}
              className="mt-1 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neutral-900 text-sm font-medium text-white disabled:opacity-40"
            >
              {submitting ? "Adding…" : "Add model"}
            </button>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-500">
              {models === null ? "Loading…" : `${models.length} models`}
            </p>
            <div className="flex flex-col gap-2">
              {(models ?? []).map((m) => (
                <div key={m.id} className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
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
                    <div className="flex shrink-0 gap-2">
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
          </div>
        </div>
      </div>
    </RequireLevel>
  );
}
