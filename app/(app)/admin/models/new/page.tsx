"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { PhotoViewer } from "@/components/shared/PhotoViewer";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders, userAuthHeaders } from "@/lib/api-client";
import { DEVICE_FIELD_CATALOG, describeField, type DeviceFieldCategory } from "@/lib/device-model-fields";

const CATEGORIES: DeviceFieldCategory[] = ["Procurement & identification", "Hardware & connectivity", "SIM & network"];

interface StagedImage {
  file: File;
  previewUrl: string;
  description: string;
}

export default function NewModelPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [name, setName] = useState("");
  const [fieldKeys, setFieldKeys] = useState<string[]>([]);
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDescription, setPendingDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  function toggleField(key: string) {
    setFieldKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function handleAddStagedImage() {
    if (!pendingFile || !pendingDescription.trim()) return;
    setStagedImages((prev) => [
      ...prev,
      { file: pendingFile, previewUrl: URL.createObjectURL(pendingFile), description: pendingDescription.trim() },
    ]);
    setPendingFile(null);
    setPendingDescription("");
  }

  function handleRemoveStagedImage(index: number) {
    setStagedImages((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
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
      const { model } = await res.json();

      let photoFailures = 0;
      for (const staged of stagedImages) {
        const formData = new FormData();
        formData.append("file", staged.file);
        formData.append("description", staged.description);
        const imgRes = await fetch(`/api/models/${model.id}/images`, {
          method: "POST",
          headers: userAuthHeaders(user),
          body: formData,
        });
        if (!imgRes.ok) photoFailures += 1;
      }

      if (photoFailures > 0) {
        setError(
          `Model created, but ${photoFailures} photo(s) didn't upload — add them from the model's photo page.`,
        );
        setSubmitting(false);
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

          <div className="flex flex-col gap-3 border-t border-neutral-200 pt-4">
            <div>
              <p className="text-sm font-medium text-neutral-800">Photos (optional)</p>
              <p className="text-xs text-neutral-500">
                e.g. device front, charger, SIM tray — whatever is useful to recognize this model by.
              </p>
            </div>

            {stagedImages.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {stagedImages.map((img, i) => (
                  <div key={img.previewUrl} className="relative rounded-xl border border-neutral-200 bg-white p-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveStagedImage(i)}
                      aria-label="Remove photo"
                      className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900/70 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setViewerIndex(i)} className="block w-full text-left">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL, not a static/remote asset Next can optimize */}
                      <img src={img.previewUrl} alt={img.description} className="h-24 w-full rounded-lg object-cover" />
                      <p className="mt-1 truncate text-xs text-neutral-600">{img.description}</p>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 p-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
                className="text-sm text-neutral-700"
              />
              <input
                value={pendingDescription}
                onChange={(e) => setPendingDescription(e.target.value)}
                placeholder="What's this photo of? e.g. Device front"
                className="min-h-[44px] rounded-xl border border-neutral-300 px-3 text-sm outline-none"
              />
              <button
                type="button"
                disabled={!pendingFile || !pendingDescription.trim()}
                onClick={handleAddStagedImage}
                className="flex min-h-[44px] w-full items-center justify-center rounded-xl border border-neutral-300 text-sm font-medium text-neutral-700 disabled:opacity-40"
              >
                Add photo
              </button>
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

      {viewerIndex !== null && (
        <PhotoViewer
          images={stagedImages.map((img) => ({ url: img.previewUrl, description: img.description }))}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </RequireLevel>
  );
}
