"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import { DEVICE_FIELD_CATALOG, describeField, type DeviceFieldCategory } from "@/lib/device-model-fields";
import type { DeviceModel } from "@/types";

const CATEGORIES: DeviceFieldCategory[] = ["Procurement & identification", "Hardware & connectivity", "SIM & network"];

export default function EditModelPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useCurrentUser();
  const [model, setModel] = useState<DeviceModel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [name, setName] = useState("");
  const [fieldKeys, setFieldKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.models ?? []).find((m: DeviceModel) => m.id === params.id);
        if (!found) {
          setNotFound(true);
          return;
        }
        setModel(found);
        setName(found.name);
        setFieldKeys(found.fieldKeys);
      });
  }, [params.id]);

  function toggleField(key: string) {
    setFieldKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleSubmit() {
    if (!model || !name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "PATCH",
        headers: userHeaders(user),
        body: JSON.stringify({ name: name.trim(), fieldKeys }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save changes");
        return;
      }
      router.push(`/admin/models/${model.id}`);
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-neutral-600">Model not found</p>
        <button
          type="button"
          onClick={() => router.push("/admin/models")}
          className="text-sm font-medium text-neutral-900 underline"
        >
          Back to models
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
            onClick={() => router.push(model ? `/admin/models/${model.id}` : "/admin/models")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold text-neutral-900">Edit model</h1>
        </div>

        {model === null ? (
          <p className="px-4 py-5 text-sm text-neutral-500">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">Model name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
                autoFocus
              />
              <span className="text-xs text-neutral-500">
                Renaming updates every device already registered under this model.
              </span>
            </label>

            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium text-neutral-800">
                Extra fields to collect when registering this model
              </p>
              {CATEGORIES.map((category) => {
                const fields = DEVICE_FIELD_CATALOG.filter((f) => f.category === category);
                return (
                  <div key={category}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      {category}
                    </p>
                    <div className="flex flex-col gap-3">
                      {fields.map((f) => (
                        <label key={f.key} className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={fieldKeys.includes(f.key)}
                            onChange={() => toggleField(f.key)}
                            className="mt-0.5 h-4 w-4 rounded border-neutral-300"
                          />
                          <span>
                            <span className="block text-sm text-neutral-800">{f.label}</span>
                            <span className="block text-xs text-neutral-500">{describeField(f)}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-neutral-500">
              Unchecking a field only affects future registrations — devices already saved with that
              field keep their value.
            </p>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              disabled={submitting || !name.trim()}
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
