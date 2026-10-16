"use client";

import { useState } from "react";
import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePendingTransactions } from "@/lib/use-pending-transactions";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import { last4 } from "@/lib/codes";
import type { IssueTransaction } from "@/types";

export default function InboxPage() {
  const { user } = useCurrentUser();
  const { items, reload } = usePendingTransactions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showIssueFor, setShowIssueFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(tx: IssueTransaction) {
    setBusyId(tx.id);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${tx.id}/confirm`, {
        method: "POST",
        headers: userHeaders(user),
        body: JSON.stringify({ confirmedByName: user.name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not confirm");
        return;
      }
      setToast(`Confirmed ${tx.deviceModel} at ${tx.toSiteName}`);
      reload();
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(tx: IssueTransaction) {
    setBusyId(tx.id);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${tx.id}/reject`, {
        method: "POST",
        headers: userHeaders(user),
        body: JSON.stringify({ note, rejectedByName: user.name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not send this report");
        return;
      }
      setToast("Issue reported");
      setShowIssueFor(null);
      setNote("");
      reload();
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <h1 className="text-xl font-semibold text-neutral-900">Waiting for you</h1>

      {toast && (
        <div className="rounded-xl bg-neutral-100 px-4 py-2 text-sm text-neutral-700">{toast}</div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {items === null ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} message="Nothing waiting for confirmation right now" />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((tx) => (
            <div key={tx.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
              <div>
                <p className="text-base font-semibold text-neutral-900">
                  {tx.deviceModel} ····{last4(tx.imei)}
                </p>
                <p className="text-sm text-neutral-500">To: {tx.toSiteName}</p>
                <p className="text-sm text-neutral-500">From: {tx.createdByName}</p>
              </div>

              {showIssueFor !== tx.id ? (
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={busyId === tx.id}
                    onClick={() => handleConfirm(tx)}
                    className="min-h-[48px] flex-1 rounded-xl bg-neutral-900 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    disabled={busyId === tx.id}
                    onClick={() => setShowIssueFor(tx.id)}
                    className="min-h-[48px] flex-1 rounded-xl border border-neutral-300 text-sm font-medium text-neutral-800 disabled:opacity-40"
                  >
                    Something is wrong
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 border-t border-neutral-200 pt-3">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What's wrong? (optional)"
                    className="min-h-[72px] w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none placeholder:text-neutral-400"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={busyId === tx.id}
                      onClick={() => handleReject(tx)}
                      className="min-h-[48px] flex-1 rounded-xl bg-neutral-900 text-sm font-medium text-white disabled:opacity-40"
                    >
                      Send report
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowIssueFor(null)}
                      className="min-h-[48px] flex-1 rounded-xl border border-neutral-300 text-sm font-medium text-neutral-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
