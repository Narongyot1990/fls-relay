"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { ConfirmCard } from "@/components/transaction/ConfirmCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PENDING_FOR_ME } from "@/lib/mock-data";
import type { PendingItem } from "@/types";

export default function InboxPage() {
  const [items, setItems] = useState<PendingItem[]>(PENDING_FOR_ME);
  const [toasts, setToasts] = useState<string[]>([]);

  function handleConfirm(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function handleReportIssue(id: string, reasonKey: string, note: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    console.info("ปัญหาที่รายงาน", { id, reasonKey, note });
    setToasts((prev) => [...prev, "ส่งรายงานปัญหาแล้ว"]);
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <h1 className="text-xl font-semibold text-neutral-900">รอให้คุณยืนยัน</h1>

      {toasts.length > 0 && (
        <div className="rounded-xl bg-neutral-100 px-4 py-2 text-sm text-neutral-700">
          {toasts[toasts.length - 1]}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState icon={Inbox} message="ไม่มีรายการรอยืนยันในขณะนี้" />
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
