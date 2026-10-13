"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Repeat,
  List,
  AlertTriangle,
  ClipboardList,
  CheckSquare,
  Download,
  PlusSquare,
  Settings,
} from "lucide-react";
import { ActionButton } from "@/components/shared/ActionButton";
import { useCurrentUser } from "@/lib/current-user";
import {
  canRunStockCount,
  canApprove,
  canExportReports,
  canRegisterDevices,
  canHandleHandovers,
  canAccessAdmin,
} from "@/lib/permissions";
import {
  OPEN_EXCEPTIONS_COUNT,
  PENDING_FOR_ME,
  UNACCOUNTED_DEVICES_COUNT,
} from "@/lib/mock-data";
import type { Device, Site } from "@/types";

export default function HomePage() {
  const { user } = useCurrentUser();
  const [site, setSite] = useState<Site | null>(null);
  const [siteCount, setSiteCount] = useState<number | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const devicesUrl = user.siteId ? `/api/devices?siteId=${user.siteId}` : "/api/devices";

    Promise.all([
      fetch("/api/sites").then((r) => r.json()),
      fetch(devicesUrl).then((r) => r.json()),
    ]).then(([sitesRes, devicesRes]) => {
      if (cancelled) return;
      const sites: Site[] = sitesRes.sites ?? [];
      setSite(user.siteId ? sites.find((s) => s.id === user.siteId) ?? null : null);
      setSiteCount(sites.length);
      setDevices(devicesRes.devices ?? []);
    });

    return () => {
      cancelled = true;
    };
  }, [user.siteId]);

  const inStock = (devices ?? []).filter((d) => d.status === "in_site_stock").length;
  const waitingCount = PENDING_FOR_ME.length;
  const showSummaryStrip = canRunStockCount(user.level) || canApprove(user.level);

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">
          {user.siteId ? site?.name ?? " " : "All sites"}
        </h1>
        <p className="text-sm text-neutral-500">
          {devices === null
            ? "Loading…"
            : user.siteId
              ? `${devices.length} phones · ${inStock} in stock`
              : `${devices.length} phones across ${siteCount ?? 0} sites · ${inStock} in stock`}
        </p>
      </div>

      {showSummaryStrip && (
        <div className="grid grid-cols-3 gap-2">
          <SummaryTile label="Pending" value={waitingCount} />
          <SummaryTile label="Exceptions" value={OPEN_EXCEPTIONS_COUNT} />
          <SummaryTile label="Unaccounted" value={UNACCOUNTED_DEVICES_COUNT} />
        </div>
      )}

      {waitingCount > 0 && (
        <Link
          href="/inbox"
          className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-amber-800"
        >
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium">{waitingCount} waiting for you to confirm</span>
        </Link>
      )}

      <div className="flex flex-col gap-3">
        {canRegisterDevices(user.level) && (
          <ActionButton href="/devices/new" icon={PlusSquare} label="Register a device" />
        )}
        {canHandleHandovers(user.level) && (
          <>
            <ActionButton href="/hand-out" icon={ArrowRight} label="Hand out a phone" />
            <ActionButton href="/take-back" icon={ArrowLeft} label="Take back a phone" />
            <ActionButton href="/swap" icon={Repeat} label="Swap a phone" />
          </>
        )}
        <ActionButton href="/devices" icon={List} label="All phones" />
        {canRunStockCount(user.level) && (
          <ActionButton href="/stock-count" icon={ClipboardList} label="Start stock count" />
        )}
        {canApprove(user.level) && (
          <ActionButton href="/approvals" icon={CheckSquare} label="Approvals" />
        )}
        {canExportReports(user.level) && (
          <ActionButton href="/export" icon={Download} label="Export" />
        )}
      </div>

      {canAccessAdmin(user.level) && (
        <div className="mt-2 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Admin</p>
          <ActionButton href="/admin" icon={Settings} label="Manage sites, people & models" />
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-center">
      <p className="text-lg font-semibold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
