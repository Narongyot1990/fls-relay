"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import type { DeviceMdmInfo } from "@/types";
import { useCurrentUser } from "@/lib/current-user";
import { canRegisterDevices } from "@/lib/permissions";
import { MDM_COMPLIANCE_LABELS, MDM_MANAGEMENT_MODE_LABELS } from "@/lib/codes";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface MdmInfoCardProps {
  imei: string;
  mdm?: DeviceMdmInfo;
}

export function MdmInfoCard({ imei, mdm }: MdmInfoCardProps) {
  const { user } = useCurrentUser();
  const canEdit = canRegisterDevices(user.level);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-neutral-900">MDM enrollment</h2>
        {canEdit && (
          <Link
            href={`/devices/${imei}/mdm`}
            className="flex items-center gap-1 text-sm text-neutral-600"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        )}
      </div>

      {!mdm ? (
        <p className="mt-2 text-sm text-neutral-500">No MDM info on file yet</p>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5 text-sm text-neutral-700">
          <p className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${MDM_COMPLIANCE_LABELS[mdm.complianceState].dotClass}`}
            />
            {MDM_COMPLIANCE_LABELS[mdm.complianceState].label} · {mdm.managedBy}
          </p>
          <p className="text-neutral-500">{mdm.deviceName}</p>
          <p>
            {MDM_MANAGEMENT_MODE_LABELS[mdm.managementMode]} · {mdm.osPlatform} {mdm.osVersion}
          </p>
          {mdm.primaryUserUpn && <p>Enrolled to {mdm.primaryUserUpn}</p>}
          {mdm.lastCheckInAt && (
            <p className="text-neutral-500">Last check-in {formatDateTime(mdm.lastCheckInAt)}</p>
          )}
        </div>
      )}
    </div>
  );
}
