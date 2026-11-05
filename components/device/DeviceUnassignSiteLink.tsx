"use client";

import Link from "next/link";
import { Undo2 } from "lucide-react";
import { useCurrentUser } from "@/lib/current-user";
import { canAssignSite } from "@/lib/permissions";
import type { DeviceStatus } from "@/types";

interface DeviceUnassignSiteLinkProps {
  imei: string;
  status: DeviceStatus;
  hasSite: boolean;
}

/** Only for a device sitting at a site with no current driver, only for L3/L4. */
export function DeviceUnassignSiteLink({ imei, status, hasSite }: DeviceUnassignSiteLinkProps) {
  const { user } = useCurrentUser();
  if (!canAssignSite(user.level) || !hasSite || (status !== "in_site_stock" && status !== "returned")) {
    return null;
  }

  return (
    <Link
      href={`/devices/${imei}/unassign`}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 text-base font-medium text-neutral-800"
    >
      <Undo2 className="h-5 w-5" />
      Unassign from this site
    </Link>
  );
}
