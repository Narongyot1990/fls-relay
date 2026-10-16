"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Images, Pencil } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import { DEVICE_FIELD_CATALOG } from "@/lib/device-model-fields";
import type { DeviceModel } from "@/types";

export default function ModelDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useCurrentUser();
  const [model, setModel] = useState<DeviceModel | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        const found = (data.models ?? []).find((m: DeviceModel) => m.id === params.id);
        if (!found) {
          setNotFound(true);
          return;
        }
        setModel(found);
      });
  }, [params.id]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  async function handleToggleActive() {
    if (!model) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "PATCH",
        headers: userHeaders(user),
        body: JSON.stringify({ active: !model.active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not update model");
        return;
      }
      loadModel();
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!model) return;
    if (!window.confirm(`Delete "${model.name}"? This can't be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "DELETE",
        headers: userHeaders(user),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete model");
        return;
      }
      router.push("/admin/models");
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-neutral-600">Model not found</p>
        <Link href="/admin/models" className="text-sm font-medium text-neutral-900 underline">
          Back to models
        </Link>
      </div>
    );
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
          <h1 className="truncate text-base font-semibold text-neutral-900">{model ? model.name : "Model"}</h1>
        </div>

        {model === null ? (
          <p className="px-4 py-5 text-sm text-neutral-500">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4 px-4 py-5">
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <span className={`text-sm font-medium ${model.active ? "text-emerald-600" : "text-neutral-400"}`}>
                {model.active ? "Active" : "Inactive"}
              </span>
              {model.fieldKeys.length > 0 && (
                <p className="mt-1 text-sm text-neutral-600">
                  {model.fieldKeys
                    .map((k) => DEVICE_FIELD_CATALOG.find((f) => f.key === k)?.label ?? k)
                    .join(", ")}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={`/admin/models/${model.id}/edit`}
                className="flex min-h-[64px] w-full items-center gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-4 active:bg-neutral-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                  <Pencil className="h-6 w-6" />
                </span>
                <span className="flex-1 text-left text-base font-medium text-neutral-900">
                  Edit name & fields
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
              </Link>
              <Link
                href={`/admin/models/${model.id}/photos`}
                className="flex min-h-[64px] w-full items-center gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-4 active:bg-neutral-50"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                  <Images className="h-6 w-6" />
                </span>
                <span className="flex-1 text-left text-base font-medium text-neutral-900">
                  Manage photos{model.images.length > 0 ? ` (${model.images.length})` : ""}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
              </Link>

              <button
                type="button"
                disabled={busy}
                onClick={handleToggleActive}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-neutral-300 text-base font-medium text-neutral-700 disabled:opacity-40"
              >
                {model.active ? "Deactivate model" : "Reactivate model"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDelete}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-red-200 text-base font-medium text-red-600 disabled:opacity-40"
              >
                Delete model
              </button>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </RequireLevel>
  );
}
