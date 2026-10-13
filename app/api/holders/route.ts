import { NextResponse } from "next/server";
import { createHolder, listHolders } from "@/lib/db/queries";
import { canManageHolders } from "@/lib/permissions";
import type { Holder, Level } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId") ?? undefined;
  const type = (searchParams.get("type") as Holder["type"] | null) ?? undefined;
  const includeInactive = searchParams.get("includeInactive") === "1";

  try {
    const holders = await listHolders({ siteId, type, includeInactive });
    return NextResponse.json({ holders });
  } catch {
    return NextResponse.json({ error: "Invalid siteId" }, { status: 400 });
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
  if (!level || !canManageHolders(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { type, name, employeeNo, siteId, phone } = body ?? {};

  if (type !== "driver" && type !== "site_leader") {
    return NextResponse.json({ error: "type must be 'driver' or 'site_leader'" }, { status: 400 });
  }
  if (!name || !employeeNo || !siteId || !phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const holder = await createHolder({ type, name, employeeNo, siteId, phone });
    return NextResponse.json({ holder }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("E11000")) {
      return NextResponse.json({ error: "Employee number already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create holder" }, { status: 400 });
  }
}
