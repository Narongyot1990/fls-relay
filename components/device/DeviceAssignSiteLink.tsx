"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { useCurrentUser } from "@/lib/current-user";
import { canAssignSite } from "@/lib/permissions";
import type { DeviceStatus } from "@/types";

interface DeviceAssignSiteLinkProps {
  imei: string;
  status: DeviceStatus;
  hasSite: boolean;
}

/** Only for an unassigned, just-registered device, only for L3/L4. */
export function DeviceAssignSiteLink({ imei, status, hasSite }: DeviceAssignSiteLinkProps) {
  const { user } = useCurrentUser();
  if (!canAssignSite(user.level) || status !== "registered" || hasSite) return null;

  return (
    <Link
      href={`/devices/${imei}/assign`}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-base font-medium text-white"
    >
      <Send className="h-5 w-5" />
      Assign to a site
    </Link>
  );
}
