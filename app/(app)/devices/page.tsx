"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Smartphone } from "lucide-react";
import { StatusBadge } from "@/components/device/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useCurrentUser } from "@/lib/current-user";
import { canViewAllSites } from "@/lib/permissions";
import { CURRENT_SITE_ID, DEVICES, getHolderById, getSiteById } from "@/lib/mock-data";
import { last4 } from "@/lib/codes";

export default function DevicesPage() {
  const [query, setQuery] = useState("");
  const { user } = useCurrentUser();
  const showAllSites = canViewAllSites(user.level);

  const devices = DEVICES.filter((d) => showAllSites || d.currentSiteId === CURRENT_SITE_ID).filter(
    (d) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const holder = getHolderById(d.currentHolderId);
      return (
        last4(d.imei).includes(q) ||
        holder?.name.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q)
      );
    },
  );

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

      {devices.length === 0 ? (
        <EmptyState icon={Smartphone} message="No matching phones" />
      ) : (
        <div className="flex flex-col gap-2">
          {devices.map((device) => {
            const holder = getHolderById(device.currentHolderId);
            const site = getSiteById(device.currentSiteId);
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
