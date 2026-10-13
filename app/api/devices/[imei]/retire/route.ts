import { NextResponse } from "next/server";
import { retireDevice } from "@/lib/db/queries";
import { canRetireDevices } from "@/lib/permissions";
import type { Level } from "@/types";

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 *
 * Spec note: retire normally requires a separate L4 approval step; no approval
 * workflow exists yet, so this is a direct action for now — same stand-in
 * pattern as other not-yet-built flows.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ imei: string }> },
) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canRetireDevices(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { imei } = await context.params;
  const result = await retireDevice(imei);
  if (!result.retired) {
    return NextResponse.json(
      { error: "Can only retire a device that's 'in stock' or 'returned'. Take it back first if it's assigned." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
