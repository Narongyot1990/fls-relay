"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Holder, Site } from "@/types";

const TYPE_LABELS: Record<Holder["type"], string> = {
  driver: "Driver",
  site_leader: "Site Leader",
};

export default function ManageHoldersPage() {
  const router = useRouter();
  const [holders, setHolders] = useState<Holder[] | null>(null);
  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    fetch("/api/holders?includeInactive=1")
      .then((r) => r.json())
      .then((data) => setHolders(data.holders ?? []));
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => setSites(data.sites ?? []));
  }, []);

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
                  <Link
                    key={h.id}
                    href={`/admin/holders/${h.id}`}
                    className="flex min-h-[64px] items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 active:bg-neutral-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-neutral-900">{h.name}</p>
                      <p className="mt-0.5 truncate text-sm text-neutral-500">
                        {TYPE_LABELS[h.type]}
                        {site ? ` · ${site.name}` : ""} ·{" "}
                        <span className={h.active ? "text-emerald-600" : "text-neutral-400"}>
                          {h.active ? "Active" : "Inactive"}
                        </span>
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </RequireLevel>
  );
}
