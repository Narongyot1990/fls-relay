import { NextResponse } from "next/server";
import { getDeviceByImei, getSiteById, unassignDeviceFromSite } from "@/lib/db/queries";
import { canAssignSite } from "@/lib/permissions";
import { REASON_LABELS } from "@/lib/codes";
import type { Level, ReasonCode } from "@/types";

/** Reverses `assign-site`. Same non-auth caveat as every other route here. */
export async function POST(
  request: Request,
  context: { params: Promise<{ imei: string }> },
) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canAssignSite(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { imei } = await context.params;
  const body = await request.json();
  const reason = typeof body?.reason === "string" ? (body.reason as ReasonCode) : null;
  const byUserName = typeof body?.byUserName === "string" ? body.byUserName : "Unknown";
  if (!reason || !(reason in REASON_LABELS)) {
    return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  }

  const existing = await getDeviceByImei(imei);
  const site = existing?.currentSiteId ? await getSiteById(existing.currentSiteId) : null;
  const byUserId = request.headers.get("x-user-id") ?? "";

  const { device, error } = await unassignDeviceFromSite(imei, {
    byUserId,
    byUserName,
    detail: `Pulled from ${site?.name ?? "its site"} — ${REASON_LABELS[reason]}`,
  });
  if (error === "device_not_found") {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  if (error === "device_not_available") {
    return NextResponse.json(
      { error: "This device isn't available to unassign — it may be with a driver or have no site." },
      { status: 409 },
    );
  }
  return NextResponse.json({ device });
}
