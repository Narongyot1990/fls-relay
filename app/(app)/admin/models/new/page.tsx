"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import { DEVICE_FIELD_CATALOG } from "@/lib/device-model-fields";

export default function NewModelPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [name, setName] = useState("");
  const [fieldKeys, setFieldKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleField(key: string) {
    setFieldKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleSubmit() {
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
      router.push("/admin/models");
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
            onClick={() => router.push("/admin/models")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold text-neutral-900">Add a phone model</h1>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Model name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Samsung Galaxy A16"
              className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              autoFocus
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
            onClick={handleSubmit}
            className="mt-2 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
          >
            {submitting ? "Adding…" : "Add model"}
          </button>
        </div>
      </div>
    </RequireLevel>
  );
}
