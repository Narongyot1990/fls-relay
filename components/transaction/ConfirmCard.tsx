"use client";

import { useState } from "react";
import type { PendingItem } from "@/types";
import { ACCESSORY_LABELS } from "@/lib/codes";

const WRONG_REASONS = [
  { key: "wrong_phone", label: "Wrong phone" },
  { key: "missing_accessory", label: "Accessory missing" },
  { key: "damaged", label: "Damaged" },
  { key: "not_me", label: "Not me" },
];

interface ConfirmCardProps {
  item: PendingItem;
  onConfirm: (id: string) => void;
  onReportIssue: (id: string, reasonKey: string, note: string) => void;
}

export function ConfirmCard({ item, onConfirm, onReportIssue }: ConfirmCardProps) {
  const [showIssue, setShowIssue] = useState(false);
  const [reasonKey, setReasonKey] = useState<string | null>(null);
  const [note, setNote] = useState("");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
      <div>
        <p className="text-base font-semibold text-neutral-900">
          {item.deviceModel} ····{item.imeiLast4}
        </p>
        <p className="text-sm text-neutral-500">From: {item.fromLabel}</p>
        <p className="text-sm text-neutral-500">{item.createdAt}</p>
      </div>

      {item.accessories && (
        <p className="text-sm text-neutral-700">
          {item.accessories.map((a) => ACCESSORY_LABELS[a]).join(", ")}
        </p>
      )}
      {item.conditionGrade && (
        <p className="text-sm text-neutral-700">Condition {item.conditionGrade}</p>
      )}
      <div className="h-16 w-16 rounded-lg bg-neutral-100" aria-hidden />

      {!showIssue ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onConfirm(item.id)}
            className="flex-1 min-h-[48px] rounded-xl bg-neutral-900 text-sm font-medium text-white active:bg-neutral-800"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setShowIssue(true)}
            className="flex-1 min-h-[48px] rounded-xl border border-neutral-300 text-sm font-medium text-neutral-800 active:bg-neutral-50"
          >
            Something is wrong
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 border-t border-neutral-200 pt-3">
          <p className="text-sm font-medium text-neutral-800">What&apos;s wrong?</p>
          <div className="flex flex-wrap gap-2">
            {WRONG_REASONS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setReasonKey(r.key)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  reasonKey === r.key
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-700"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="min-h-[72px] w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none placeholder:text-neutral-400"
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!reasonKey}
              onClick={() => reasonKey && onReportIssue(item.id, reasonKey, note)}
              className="flex-1 min-h-[48px] rounded-xl bg-neutral-900 text-sm font-medium text-white disabled:opacity-40"
            >
              Send report
            </button>
            <button
              type="button"
              onClick={() => setShowIssue(false)}
              className="flex-1 min-h-[48px] rounded-xl border border-neutral-300 text-sm font-medium text-neutral-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
