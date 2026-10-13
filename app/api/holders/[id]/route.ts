import { NextResponse } from "next/server";
import { deleteHolder, setHolderActive } from "@/lib/db/queries";
import { canManageHolders } from "@/lib/permissions";
import type { Level } from "@/types";

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageHolders(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  if (typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) is required" }, { status: 400 });
  }

  const { holder, blockedDevices } = await setHolderActive(id, body.active);
  if (blockedDevices > 0) {
    return NextResponse.json(
      { error: `Cannot deactivate — ${blockedDevices} device(s) are currently assigned to this person.` },
      { status: 409 },
    );
  }
  if (!holder) return NextResponse.json({ error: "Holder not found" }, { status: 404 });
  return NextResponse.json({ holder });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageHolders(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteHolder(id);
  if (!result.deleted) {
    return NextResponse.json(
      { error: `Cannot delete — ${result.devices} device(s) are currently assigned to this person.` },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
