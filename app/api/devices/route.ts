import { NextResponse } from "next/server";
import { createDevice, listDevices } from "@/lib/db/queries";
import { canRegisterDevices } from "@/lib/permissions";
import type { DeviceStatus, Level } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId") ?? undefined;
  const status = (searchParams.get("status") as DeviceStatus | null) ?? undefined;
  const holderId = searchParams.get("holderId") ?? undefined;

  try {
    const devices = await listDevices({ siteId, status, holderId });
    return NextResponse.json({ devices });
  } catch {
    return NextResponse.json({ error: "Invalid siteId or holderId" }, { status: 400 });
  }
}

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 */
export async function POST(request: Request) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canRegisterDevices(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { imei, serial, model, phoneNumber, siteId, customFields } = body ?? {};

  if (!imei || !serial || !model || !phoneNumber || !siteId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const safeCustomFields: Record<string, string> =
    customFields && typeof customFields === "object"
      ? Object.fromEntries(
          Object.entries(customFields).filter(
            ([, v]) => typeof v === "string" && v.trim() !== "",
          ) as [string, string][],
        )
      : {};

  try {
    const device = await createDevice({ imei, serial, model, phoneNumber, siteId, customFields: safeCustomFields });
    return NextResponse.json({ device }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("E11000")) {
      return NextResponse.json({ error: "IMEI or serial already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not register device" }, { status: 400 });
  }
}
