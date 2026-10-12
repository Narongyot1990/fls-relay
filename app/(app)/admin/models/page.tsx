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
                  <p className="text-base font-medium text-neutral-900">{m.name}</p>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {m.fieldKeys.length === 0
                      ? "No extra fields"
                      : m.fieldKeys
                          .map((k) => DEVICE_FIELD_CATALOG.find((f) => f.key === k)?.label ?? k)
                          .join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RequireLevel>
  );
}
