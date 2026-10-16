"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Smartphone, AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/device/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCurrentUser } from "@/lib/current-user";
import { canViewAllSites, sitesInScope } from "@/lib/permissions";
import { last4 } from "@/lib/codes";
import type { Device, DeviceStatus, Holder, Site } from "@/types";

const STATUS_FILTERS: { key: DeviceStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registered", label: "Registered" },
  { key: "in_site_stock", label: "In stock" },
  { key: "assigned", label: "Assigned" },
  { key: "returned", label: "Returned" },
  { key: "retired", label: "Retired" },
  { key: "lost", label: "Lost" },
];

export default function DevicesPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "all">("all");
  const [activeSiteId, setActiveSiteId] = useState<string>("all");
  const { user } = useCurrentUser();
  const canFilterBySite = canViewAllSites(user.level);
  const scope = sitesInScope(user);

  const [devices, setDevices] = useState<Device[] | null>(null);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [allSites, setAllSites] = useState<Site[]>([]);
  const [error, setError] = useState(false);

  const scopedSites = useMemo(
    () => (scope === "all" ? allSites : allSites.filter((s) => scope.includes(s.id))),
    [allSites, scope],
  );

  useEffect(() => {
    let cancelled = false;

    const siteParam = canFilterBySite ? (activeSiteId === "all" ? undefined : activeSiteId) : user.siteId ?? undefined;
    const devicesUrl = siteParam ? `/api/devices?siteId=${siteParam}` : "/api/devices";

    Promise.all([
      fetch(devicesUrl).then((r) => r.json()),
      fetch("/api/holders").then((r) => r.json()),
      canFilterBySite ? fetch("/api/sites?activeOnly=1").then((r) => r.json()) : Promise.resolve({ sites: [] }),
    ])
      .then(([devicesRes, holdersRes, sitesRes]) => {
        if (cancelled) return;
        setError(false);
        setDevices(devicesRes.devices ?? []);
        setHolders(holdersRes.holders ?? []);
        setAllSites(sitesRes.sites ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [canFilterBySite, activeSiteId, user.siteId]);

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<DeviceStatus, number>> = {};
    for (const d of devices ?? []) counts[d.status] = (counts[d.status] ?? 0) + 1;
    return counts;
  }, [devices]);

  const filtered = (devices ?? []).filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const holder = holders.find((h) => h.id === d.currentHolderId);
    const site = allSites.find((s) => s.id === d.currentSiteId);
    return (
      last4(d.imei).includes(q) ||
      d.model.toLowerCase().includes(q) ||
      d.phoneNumber.toLowerCase().includes(q) ||
      holder?.name.toLowerCase().includes(q) ||
      site?.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">
          {canFilterBySite ? "All phones" : "Phones at my site"}
        </h1>
        <span className="text-sm text-neutral-500">
          {devices !== null && `${filtered.length} of ${devices.length}`}
        </span>
      </div>

      {canFilterBySite && (
        <select
          value={activeSiteId}
          onChange={(e) => setActiveSiteId(e.target.value)}
          className="min-h-[44px] rounded-xl border border-neutral-300 bg-white px-3 text-sm"
        >
          <option value="all">All sites</option>
          {scopedSites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <Search className="h-5 w-5 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search model, holder, site, or last 4 digits"
          className="w-full bg-transparent text-base outline-none placeholder:text-neutral-400"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              statusFilter === f.key
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-700"
            }`}
          >
            {f.label}
            {f.key !== "all" && statusCounts[f.key] ? ` (${statusCounts[f.key]})` : ""}
          </button>
        ))}
      </div>

      {error ? (
        <EmptyState icon={AlertTriangle} message="Couldn't load phones. Try again." />
      ) : devices === null ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Smartphone} message="No matching phones" />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((device) => {
            const holder = holders.find((h) => h.id === device.currentHolderId);
            const site = allSites.find((s) => s.id === device.currentSiteId);
            return (
              <Link
                key={device.id}
                href={`/devices/${device.imei}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-neutral-900">{device.model}</p>
                  <p className="mt-0.5 truncate text-sm text-neutral-500">
                    {holder ? holder.name : "Unassigned"}
                    {canFilterBySite && site ? ` · ${site.name}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={device.status} />
                  <span className="text-sm text-neutral-500">····{last4(device.imei)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
