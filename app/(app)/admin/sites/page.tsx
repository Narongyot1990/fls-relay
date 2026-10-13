"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import type { Site } from "@/types";

export default function ManageSitesPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [sites, setSites] = useState<Site[] | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadSites() {
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => setSites(data.sites ?? []));
  }

  useEffect(() => {
    loadSites();
  }, []);

  async function handleAdd() {
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: userHeaders(user),
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not create site");
        return;
      }
      setName("");
      loadSites();
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(site: Site) {
    setBusyId(site.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PATCH",
        headers: userHeaders(user),
        body: JSON.stringify({ active: !site.active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRowError({ id: site.id, message: data.error ?? "Could not update site" });
        return;
      }
      loadSites();
    } catch {
      setRowError({ id: site.id, message: "Network error — try again" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(site: Site) {
    if (!window.confirm(`Delete "${site.name}"? This can't be undone.`)) return;
    setBusyId(site.id);
    setRowError(null);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "DELETE",
        headers: userHeaders(user),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRowError({ id: site.id, message: data.error ?? "Could not delete site" });
        return;
      }
      loadSites();
    } catch {
      setRowError({ id: site.id, message: "Network error — try again" });
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
          <h1 className="text-base font-semibold text-neutral-900">Manage sites</h1>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">New site name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pattaya site"
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={submitting || !name.trim()}
              onClick={handleAdd}
              className="mt-1 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neutral-900 text-sm font-medium text-white disabled:opacity-40"
            >
              {submitting ? "Adding…" : "Add site"}
            </button>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-500">
              {sites === null ? "Loading…" : `${sites.length} sites`}
            </p>
            <div className="flex flex-col gap-2">
              {(sites ?? []).map((s) => (
                <div key={s.id} className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-neutral-900">{s.name}</p>
                      <p className="text-sm text-neutral-500">
                        {s.code} ·{" "}
                        <span className={s.active ? "text-emerald-600" : "text-neutral-400"}>
                          {s.active ? "Active" : "Inactive"}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => handleToggleActive(s)}
                        className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 disabled:opacity-40"
                      >
                        {s.active ? "Deactivate" : "Reactivate"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => handleDelete(s)}
                        className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-600 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {rowError?.id === s.id && <p className="mt-2 text-sm text-red-600">{rowError.message}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RequireLevel>
  );
}
