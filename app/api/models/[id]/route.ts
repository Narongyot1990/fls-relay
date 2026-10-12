import { NextResponse } from "next/server";
import { deleteModel, setModelActive } from "@/lib/db/queries";
import { canManageCatalog } from "@/lib/permissions";
import type { Level } from "@/types";

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageCatalog(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  if (typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "active (boolean) is required" }, { status: 400 });
  }

  const model = await setModelActive(id, body.active);
  if (!model) return NextResponse.json({ error: "Model not found" }, { status: 404 });
  return NextResponse.json({ model });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageCatalog(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const result = await deleteModel(id);
  if (!result.deleted) {
    return NextResponse.json(
      { error: `Cannot delete — ${result.devices} device(s) are registered with this model. Deactivate it instead.` },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
