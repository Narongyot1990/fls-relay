"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Users } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import type { Holder, Site } from "@/types";

const TYPE_LABELS: Record<Holder["type"], string> = {
  driver: "Driver",
  site_leader: "Site Leader",
};

export default function ManageHoldersPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [holders, setHolders] = useState<Holder[] | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadHolders() {
    fetch("/api/holders?includeInactive=1")
      .then((r) => r.json())
      .then((data) => setHolders(data.holders ?? []));
  }

  useEffect(() => {
    loadHolders();
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => setSites(data.sites ?? []));
  }, []);

  async function handleToggleActive(holder: Holder) {
    setBusyId(holder.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/holders/${holder.id}`, {
        method: "PATCH",
        headers: userHeaders(user),
        body: JSON.stringify({ active: !holder.active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRowError({ id: holder.id, message: data.error ?? "Could not update person" });
        return;
      }
      loadHolders();
    } catch {
      setRowError({ id: holder.id, message: "Network error — try again" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(holder: Holder) {
    if (!window.confirm(`Delete "${holder.name}"? This can't be undone.`)) return;
    setBusyId(holder.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/holders/${holder.id}`, {
        method: "DELETE",
        headers: userHeaders(user),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRowError({ id: holder.id, message: data.error ?? "Could not delete person" });
        return;
      }
      loadHolders();
    } catch {
      setRowError({ id: holder.id, message: "Network error — try again" });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <RequireLevel allow={["L1", "L4"]}>
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
          <h1 className="flex-1 text-base font-semibold text-neutral-900">Manage people</h1>
          <Link
            href="/admin/holders/new"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Add person"
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          <p className="text-sm font-medium text-neutral-500">
            {holders === null ? "Loading…" : `${holders.length} people`}
          </p>

          {holders !== null && holders.length === 0 ? (
            <EmptyState
              icon={Users}
              message="No people yet"
              action={
                <Link href="/admin/holders/new" className="text-sm font-medium text-neutral-900 underline">
                  Add the first person
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {(holders ?? []).map((h) => {
                const site = sites.find((s) => s.id === h.siteId);
                return (
                  <div key={h.id} className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium text-neutral-900">{h.name}</p>
                        <p className="mt-0.5 truncate text-sm text-neutral-500">
                          {TYPE_LABELS[h.type]} · {h.employeeNo}
                          {site ? ` · ${site.name}` : ""} ·{" "}
                          <span className={h.active ? "text-emerald-600" : "text-neutral-400"}>
                            {h.active ? "Active" : "Inactive"}
                          </span>
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={busyId === h.id}
                          onClick={() => handleToggleActive(h)}
                          className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 disabled:opacity-40"
                        >
                          {h.active ? "Deactivate" : "Reactivate"}
                        </button>
                        <button
                          type="button"
                          disabled={busyId === h.id}
                          onClick={() => handleDelete(h)}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-600 disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {rowError?.id === h.id && <p className="mt-2 text-sm text-red-600">{rowError.message}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </RequireLevel>
  );
}
