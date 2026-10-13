"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userAuthHeaders } from "@/lib/api-client";
import type { DeviceModel } from "@/types";

export default function ModelPhotosPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useCurrentUser();
  const [model, setModel] = useState<DeviceModel | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDescription, setPendingDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
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

  async function handleAdd() {
    if (!pendingFile || !pendingDescription.trim()) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      formData.append("description", pendingDescription.trim());
      const res = await fetch(`/api/models/${params.id}/images`, {
        method: "POST",
        headers: userAuthHeaders(user),
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not upload photo");
        return;
      }
      setPendingFile(null);
      setPendingDescription("");
      loadModel();
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(url: string) {
    if (!window.confirm("Remove this photo?")) return;
    setRemovingUrl(url);
    setError(null);
    try {
      const res = await fetch(`/api/models/${params.id}/images?url=${encodeURIComponent(url)}`, {
        method: "DELETE",
        headers: userAuthHeaders(user),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not remove photo");
        return;
      }
      loadModel();
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setRemovingUrl(null);
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
            onClick={() => router.push("/admin/models")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold text-neutral-900">
            {model ? `Photos · ${model.name}` : "Photos"}
          </h1>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          {model === null ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : model.images.length === 0 ? (
            <p className="text-sm text-neutral-500">No photos yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {model.images.map((img) => (
                <div key={img.url} className="relative rounded-xl border border-neutral-200 bg-white p-2">
                  <button
                    type="button"
                    disabled={removingUrl === img.url}
                    onClick={() => handleRemove(img.url)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900/70 text-white disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote blob URL, not worth Next/Image config here */}
                  <img src={img.url} alt={img.description} className="h-28 w-full rounded-lg object-cover" />
                  <p className="mt-1 truncate text-xs text-neutral-600">{img.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-neutral-300 p-3">
            <p className="text-sm font-medium text-neutral-800">Add a photo</p>
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={uploading || !pendingFile || !pendingDescription.trim()}
              onClick={handleAdd}
              className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neutral-900 text-sm font-medium text-white disabled:opacity-40"
            >
              {uploading ? "Uploading…" : "Add photo"}
            </button>
          </div>
        </div>
      </div>
    </RequireLevel>
  );
}
