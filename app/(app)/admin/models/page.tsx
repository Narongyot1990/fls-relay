"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Images, Plus, Smartphone } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { EmptyState } from "@/components/shared/EmptyState";
import { PhotoViewer } from "@/components/shared/PhotoViewer";
import { blobViewUrl } from "@/lib/blob";
import type { DeviceModel } from "@/types";

export default function ManageModelsPage() {
  const router = useRouter();
  const [models, setModels] = useState<DeviceModel[] | null>(null);
  const [viewerModel, setViewerModel] = useState<DeviceModel | null>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => setModels(data.models ?? []));
  }, []);

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
                <div key={m.id} className="flex items-stretch gap-2">
                  <Link
                    href={`/admin/models/${m.id}`}
                    className="flex min-h-[64px] flex-1 items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 active:bg-neutral-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-neutral-900">{m.name}</p>
                      <p className="mt-0.5 text-sm">
                        <span className={m.active ? "text-emerald-600" : "text-neutral-400"}>
                          {m.active ? "Active" : "Inactive"}
                        </span>
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
                  </Link>
                  <button
                    type="button"
                    disabled={m.images.length === 0}
                    onClick={() => setViewerModel(m)}
                    aria-label={`View photos for ${m.name}`}
                    className="relative flex w-[56px] shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 disabled:opacity-30"
                  >
                    <Images className="h-5 w-5" />
                    {m.images.length > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-semibold text-white">
                        {m.images.length}
                      </span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {viewerModel && (
        <PhotoViewer
          images={viewerModel.images.map((img) => ({ url: blobViewUrl(img.url), description: img.description }))}
          onClose={() => setViewerModel(null)}
        />
      )}
    </RequireLevel>
  );
}
