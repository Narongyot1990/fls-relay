import { NextResponse } from "next/server";
import { deleteSite, setSiteActive } from "@/lib/db/queries";
import { canManageSites } from "@/lib/permissions";
import type { Level } from "@/types";

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageSites(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  if (typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) is required" }, { status: 400 });
  }

  const site = await setSiteActive(id, body.active);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  return NextResponse.json({ site });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageSites(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteSite(id);
  if (!result.deleted) {
    return NextResponse.json(
      {
        error: `Cannot delete — ${result.holders} holder(s) and ${result.devices} device(s) still reference this site. Deactivate it instead.`,
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
