"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import { useCurrentUser } from "@/lib/current-user";
import { canIssueToSite } from "@/lib/permissions";
import type { DeviceStatus } from "@/types";

interface DeviceIssueLinkProps {
  imei: string;
  status: DeviceStatus;
  hasSite: boolean;
}

/** "Issue to a site" (T1) — only for an unassigned, just-registered device, only for L3/L4. */
export function DeviceIssueLink({ imei, status, hasSite }: DeviceIssueLinkProps) {
  const { user } = useCurrentUser();
  if (!canIssueToSite(user.level) || status !== "registered" || hasSite) return null;

  return (
    <Link
      href={`/devices/${imei}/issue`}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-base font-medium text-white"
    >
      <Send className="h-5 w-5" />
      Issue to a site
    </Link>
  );
}
