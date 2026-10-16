import { NextResponse } from "next/server";
import { createIssueTransaction } from "@/lib/db/queries";
import { canIssueToSite } from "@/lib/permissions";
import type { Level } from "@/types";

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 *
 * Records a T1 "Issue to Site" decision — does not move the device. It only
 * moves once the destination site leader confirms (see /[id]/confirm), per
 * the spec's two-sided confirmation principle.
 */
export async function POST(request: Request) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canIssueToSite(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { imei, toSiteId, createdById, createdByName } = body ?? {};

  if (!imei || !toSiteId || !createdById || !createdByName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { transaction, error } = await createIssueTransaction({ imei, toSiteId, createdById, createdByName });
  if (error === "device_not_found") {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  if (error === "device_not_available") {
    return NextResponse.json(
      { error: "This device already has a site, or isn't in a registered state." },
      { status: 409 },
    );
  }
  return NextResponse.json({ transaction }, { status: 201 });
}
