import { NextResponse } from "next/server";
import { getDeviceByImei } from "@/lib/db/queries";

export async function GET(
  _request: Request,
  context: { params: Promise<{ imei: string }> },
) {
  const { imei } = await context.params;
  const device = await getDeviceByImei(imei);
  if (!device) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  return NextResponse.json({ device });
}
