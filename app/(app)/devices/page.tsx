"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Smartphone } from "lucide-react";
import { StatusBadge } from "@/components/device/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { CURRENT_SITE_ID, DEVICES, getHolderById } from "@/lib/mock-data";
import { last4 } from "@/lib/codes";

export default function DevicesPage() {
  const [query, setQuery] = useState("");

  const devices = DEVICES.filter((d) => d.currentSiteId === CURRENT_SITE_ID).filter((d) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const holder = getHolderById(d.currentHolderId);
    return last4(d.imei).includes(q) || holder?.name.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">โทรศัพท์ในไซต์</h1>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <Search className="h-5 w-5 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาด้วยเลข 4 ตัวท้าย หรือชื่อผู้ถือ"
          className="w-full bg-transparent text-base outline-none placeholder:text-neutral-400"
        />
      </div>

      {devices.length === 0 ? (
        <EmptyState icon={Smartphone} message="ไม่พบโทรศัพท์ที่ค้นหา" />
      ) : (
        <div className="flex flex-col gap-2">
          {devices.map((device) => {
            const holder = getHolderById(device.currentHolderId);
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
