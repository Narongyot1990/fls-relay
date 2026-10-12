"use client";

import { Camera, X } from "lucide-react";

interface EvidenceCaptureProps {
  label: string;
  photoUrl: string | null;
  onCapture: () => void;
  onRemove: () => void;
}

export function EvidenceCapture({ label, photoUrl, onCapture, onRemove }: EvidenceCaptureProps) {
  if (photoUrl) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <div className="h-14 w-14 shrink-0 rounded-lg bg-neutral-200" aria-label="thumbnail" />
        <span className="flex-1 text-sm text-neutral-600">Photo attached</span>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-100"
          aria-label="Remove photo"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onCapture}
      className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white text-base text-neutral-700 active:bg-neutral-50"
    >
      <Camera className="h-5 w-5" />
      {label}
    </button>
  );
}
