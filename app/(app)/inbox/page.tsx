"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { ConfirmCard } from "@/components/transaction/ConfirmCard";
import { EmptyState } from "@/components/shared/EmptyState";
import type { PendingItem } from "@/types";

export default function InboxPage() {
  // Starts empty — the transactions ledger isn't wired up yet, so there is
  // genuinely nothing pending, not a placeholder standing in for real data.
  const [items, setItems] = useState<PendingItem[]>([]);
  const [toasts, setToasts] = useState<string[]>([]);

  function handleConfirm(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleReportIssue(id: string, reasonKey: string, note: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    console.info("Issue reported", { id, reasonKey, note });
    setToasts((prev) => [...prev, "Issue reported"]);
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <h1 className="text-xl font-semibold text-neutral-900">Waiting for you</h1>

      {toasts.length > 0 && (
        <div className="rounded-xl bg-neutral-100 px-4 py-2 text-sm text-neutral-700">
          {toasts[toasts.length - 1]}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={Inbox} message="Nothing waiting for confirmation right now" />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ConfirmCard
              key={item.id}
              item={item}
              onConfirm={handleConfirm}
              onReportIssue={handleReportIssue}
            />
          ))}
        </div>
      )}
    </div>
  );
}
