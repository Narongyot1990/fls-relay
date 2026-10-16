import { NextResponse } from "next/server";
import { deleteModel, setModelActive, updateModel } from "@/lib/db/queries";
import { canManageModels } from "@/lib/permissions";
import { DEVICE_FIELD_CATALOG } from "@/lib/device-model-fields";
import type { Level } from "@/types";

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 *
 * Accepts either an active-toggle (`{ active }`) or an edit (`{ name?,
 * fieldKeys? }`) — kept as one handler since both are "partial update this
 * model" and share the same permission gate.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageModels(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  if (typeof body?.active === "boolean") {
    const model = await setModelActive(id, body.active);
    if (!model) return NextResponse.json({ error: "Model not found" }, { status: 404 });
    return NextResponse.json({ model });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Model name is required" }, { status: 400 });
  }

  const validKeys = new Set(DEVICE_FIELD_CATALOG.map((f) => f.key));
  const fieldKeys: string[] | undefined = Array.isArray(body?.fieldKeys)
    ? body.fieldKeys.filter((k: unknown) => typeof k === "string" && validKeys.has(k))
    : undefined;

  if (name === undefined && fieldKeys === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { model, error } = await updateModel(id, { name, fieldKeys });
  if (error === "not_found") return NextResponse.json({ error: "Model not found" }, { status: 404 });
  if (error === "duplicate_name") {
    return NextResponse.json({ error: "A model with this name already exists" }, { status: 409 });
  }
  return NextResponse.json({ model });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageModels(level)) {
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
