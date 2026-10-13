"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
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

  const [type, setType] = useState<Holder["type"]>("driver");
  const [name, setName] = useState("");
  const [employeeNo, setEmployeeNo] = useState("");
  const [siteId, setSiteId] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function loadHolders() {
    fetch("/api/holders?includeInactive=1")
      .then((r) => r.json())
      .then((data) => setHolders(data.holders ?? []));
  }

  useEffect(() => {
    loadHolders();
    fetch("/api/sites?activeOnly=1")
      .then((r) => r.json())
      .then((data) => {
        setSites(data.sites ?? []);
        setSiteId((prev) => prev || data.sites?.[0]?.id || "");
      });
  }, []);

  const canSubmit = name.trim() !== "" && employeeNo.trim() !== "" && siteId !== "" && phone.trim() !== "";

  async function handleAdd() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/holders", {
        method: "POST",
        headers: userHeaders(user),
        body: JSON.stringify({ type, name: name.trim(), employeeNo: employeeNo.trim(), siteId, phone: phone.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not create person");
        return;
      }
      setName("");
      setEmployeeNo("");
      setPhone("");
      loadHolders();
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

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
          <h1 className="text-base font-semibold text-neutral-900">Manage people</h1>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex gap-2">
              {(["driver", "site_leader"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    type === t
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 text-neutral-700"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">Employee number</span>
              <input
                value={employeeNo}
                onChange={(e) => setEmployeeNo(e.target.value)}
                placeholder="e.g. DRV-0142"
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">Site</span>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="min-h-[48px] rounded-xl border border-neutral-300 bg-white px-3 text-base"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="089-000-0000"
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              />
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              disabled={submitting || !canSubmit}
              onClick={handleAdd}
              className="mt-1 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neutral-900 text-sm font-medium text-white disabled:opacity-40"
            >
              {submitting ? "Adding…" : "Add person"}
            </button>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-500">
              {holders === null ? "Loading…" : `${holders.length} people`}
            </p>
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
          </div>
        </div>
      </div>
    </RequireLevel>
  );
}
