import { NextResponse } from "next/server";
import { assignDeviceToSite, getSiteById } from "@/lib/db/queries";
import { canAssignSite } from "@/lib/permissions";
import type { Level } from "@/types";

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 *
 * Single-step MVP: assigns an unassigned device straight to a site. Ops
 * Supervisor/Management already "see everything", so their decision is
 * authoritative on its own — no separate site-leader confirm gate.
 */
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
  const siteId = typeof body?.siteId === "string" ? body.siteId : "";
  const byUserName = typeof body?.byUserName === "string" ? body.byUserName : "Unknown";
  if (!siteId) {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }

  const site = await getSiteById(siteId);
  const byUserId = request.headers.get("x-user-id") ?? "";
  const { device, error } = await assignDeviceToSite(imei, siteId, {
    byUserId,
    byUserName,
    detail: `To ${site?.name ?? "a site"}`,
  });
  if (error === "device_not_found") {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  if (error === "device_not_available") {
    return NextResponse.json(
      { error: "This device already has a site, or isn't in a registered state." },
      { status: 409 },
    );
  }
  return NextResponse.json({ device });
}
