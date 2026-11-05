import { NextResponse } from "next/server";
import { getHolderById, handOutDevice } from "@/lib/db/queries";
import { canHandleHandovers } from "@/lib/permissions";
import { ACCESSORY_LABELS } from "@/lib/codes";
import type { AccessoryKey, Level } from "@/types";

/** Site Leader hands a phone from site stock to a specific driver. */
export async function POST(
  request: Request,
  context: { params: Promise<{ imei: string }> },
) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canHandleHandovers(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { imei } = await context.params;
  const body = await request.json();
  const holderId = typeof body?.holderId === "string" ? body.holderId : "";
  const accessories: AccessoryKey[] = Array.isArray(body?.accessories) ? body.accessories : [];
  const conditionGrade = typeof body?.conditionGrade === "string" ? body.conditionGrade : "";
  const evidenceAttached = body?.evidenceAttached === true;
  const byUserName = typeof body?.byUserName === "string" ? body.byUserName : "Unknown";
  if (!holderId) {
    return NextResponse.json({ error: "holderId is required" }, { status: 400 });
  }
  if (!evidenceAttached) {
    return NextResponse.json({ error: "A signed form or signature is required" }, { status: 400 });
  }

  const holder = await getHolderById(holderId);
  const byUserId = request.headers.get("x-user-id") ?? "";
  const accessoryText = accessories.length
    ? accessories.map((a) => ACCESSORY_LABELS[a] ?? a).join(", ")
    : "no accessories";

  const { device, error } = await handOutDevice(imei, holderId, {
    byUserId,
    byUserName,
    detail: `To ${holder?.name ?? "a driver"} · ${accessoryText} · Condition ${conditionGrade || "-"}`,
  });
  if (error === "device_not_found") {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  if (error === "device_not_available") {
    return NextResponse.json({ error: "This device isn't available in site stock." }, { status: 409 });
  }
  if (error === "holder_not_found") {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }
  if (error === "holder_wrong_site") {
    return NextResponse.json({ error: "That driver isn't at this device's site" }, { status: 409 });
  }
  return NextResponse.json({ device });
}
