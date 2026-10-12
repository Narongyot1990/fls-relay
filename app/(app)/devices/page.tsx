"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Smartphone, AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/device/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCurrentUser } from "@/lib/current-user";
import { canViewAllSites } from "@/lib/permissions";
import { last4 } from "@/lib/codes";
import type { Device, Holder, Site } from "@/types";

export default function DevicesPage() {
  const [query, setQuery] = useState("");
  const { user } = useCurrentUser();
  const showAllSites = canViewAllSites(user.level);

  const [devices, setDevices] = useState<Device[] | null>(null);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const devicesUrl = showAllSites ? "/api/devices" : `/api/devices?siteId=${user.siteId}`;

    Promise.all([
      fetch(devicesUrl).then((r) => r.json()),
      fetch("/api/holders").then((r) => r.json()),
      showAllSites ? fetch("/api/sites").then((r) => r.json()) : Promise.resolve({ sites: [] }),
    ])
      .then(([devicesRes, holdersRes, sitesRes]) => {
        if (cancelled) return;
        setError(false);
        setDevices(devicesRes.devices ?? []);
        setHolders(holdersRes.holders ?? []);
        setSites(sitesRes.sites ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [showAllSites, user.siteId]);

  const filtered = (devices ?? []).filter((d) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const holder = holders.find((h) => h.id === d.currentHolderId);
    return (
      last4(d.imei).includes(q) ||
      holder?.name.toLowerCase().includes(q) ||
      d.model.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">
          {showAllSites ? "All phones" : "Phones at my site"}
        </h1>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <Search className="h-5 w-5 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by last 4 digits, holder, or model"
          className="w-full bg-transparent text-base outline-none placeholder:text-neutral-400"
        />
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
            const site = sites.find((s) => s.id === device.currentSiteId);
            return (
              <Link
                key={device.id}
                href={`/devices/${device.imei}`}
                className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3"
              >
                <div>
                  <StatusBadge status={device.status} />
                  <p className="mt-1 text-sm text-neutral-500">
                    {holder ? holder.name : device.model}
                    {showAllSites && site ? ` · ${site.name}` : ""}
                  </p>
                </div>
                <span className="text-sm text-neutral-500">····{last4(device.imei)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
