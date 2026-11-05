import { NextResponse } from "next/server";
import { takeBackDevice } from "@/lib/db/queries";
import { canHandleHandovers } from "@/lib/permissions";
import { ACCESSORY_LABELS } from "@/lib/codes";
import type { AccessoryKey, Level } from "@/types";

/** Site Leader receives a phone back from its current driver. */
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
  const accessories: AccessoryKey[] = Array.isArray(body?.accessories) ? body.accessories : [];
  const conditionGrade = typeof body?.conditionGrade === "string" ? body.conditionGrade : "";
  const byUserName = typeof body?.byUserName === "string" ? body.byUserName : "Unknown";

  const byUserId = request.headers.get("x-user-id") ?? "";
  const accessoryText = accessories.length
    ? accessories.map((a) => ACCESSORY_LABELS[a] ?? a).join(", ")
    : "no accessories";

  const { device, error } = await takeBackDevice(imei, {
    byUserId,
    byUserName,
    detail: `Returned · ${accessoryText} · Condition ${conditionGrade || "-"}`,
  });
  if (error === "device_not_found") {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  if (error === "device_not_available") {
    return NextResponse.json({ error: "This device isn't currently assigned to anyone." }, { status: 409 });
  }
  return NextResponse.json({ device });
}
