import { NextResponse } from "next/server";
import { deleteDevice, getDeviceByImei, updateDeviceCore } from "@/lib/db/queries";
import { canRegisterDevices } from "@/lib/permissions";
import type { Level } from "@/types";

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

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 *
 * Edits the core identity fields only (imei/serial/phoneNumber) — not model,
 * which is a riskier change (it can affect which custom fields apply) and
 * isn't offered here. Mainly exists so a CSV-imported device's placeholder
 * IMEI and blank phone number can be filled in once known.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ imei: string }> },
) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canRegisterDevices(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { imei } = await context.params;
  const body = await request.json();
  const update: { imei?: string; serial?: string; phoneNumber?: string } = {};
  if (typeof body?.imei === "string" && body.imei.trim()) update.imei = body.imei;
  if (typeof body?.serial === "string" && body.serial.trim()) update.serial = body.serial;
  if (typeof body?.phoneNumber === "string") update.phoneNumber = body.phoneNumber;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { device, error } = await updateDeviceCore(imei, update);
  if (error === "not_found") return NextResponse.json({ error: "Device not found" }, { status: 404 });
  if (error === "duplicate") {
    return NextResponse.json({ error: "That IMEI or serial is already registered" }, { status: 409 });
  }
  return NextResponse.json({ device });
}

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 *
 * Hard delete — only succeeds for a pure mis-registration (status "registered",
 * never assigned). Anything with real custody history must be retired instead
 * (see /retire), never deleted, per the spec's "never delete historical records"
 * principle.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ imei: string }> },
) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canRegisterDevices(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { imei } = await context.params;
  const result = await deleteDevice(imei);
  if (!result.deleted) {
    return NextResponse.json(
      { error: "Can only delete a device that's still 'registered' and was never assigned. Retire it instead." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
