import { NextResponse } from "next/server";
import { getDeviceByImei, updateDeviceMdm } from "@/lib/db/queries";
import { canRegisterDevices } from "@/lib/permissions";
import type { DeviceMdmInfo, Level } from "@/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ imei: string }> },
) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canRegisterDevices(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { imei } = await context.params;
  const existing = await getDeviceByImei(imei);
  if (!existing) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  const body = await request.json();
  const {
    deviceName,
    managedBy,
    ownershipType,
    managementMode,
    complianceState,
    osPlatform,
    osVersion,
    primaryUserUpn,
    updatedBy,
  } = body ?? {};

  if (!deviceName || !osVersion) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const mdm: DeviceMdmInfo = {
    deviceName,
    managedBy: managedBy ?? "Intune",
    ownershipType: ownershipType ?? "corporate",
    managementMode: managementMode ?? "dedicated",
    complianceState: complianceState ?? "unknown",
    osPlatform: osPlatform ?? "Android",
    osVersion,
    primaryUserUpn: primaryUserUpn || null,
    lastCheckInAt: existing.mdm?.lastCheckInAt ?? null,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy ?? "unknown",
  };

  const device = await updateDeviceMdm(imei, mdm);
  return NextResponse.json({ device });
}
