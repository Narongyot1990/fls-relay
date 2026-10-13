import { NextResponse } from "next/server";
import { createModel, listModels } from "@/lib/db/queries";
import { canManageModels } from "@/lib/permissions";
import { DEVICE_FIELD_CATALOG } from "@/lib/device-model-fields";
import type { Level } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "1";
  const models = await listModels({ activeOnly });
  return NextResponse.json({ models });
}

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 */
export async function POST(request: Request) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageModels(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Model name is required" }, { status: 400 });
  }

  const validKeys = new Set(DEVICE_FIELD_CATALOG.map((f) => f.key));
  const fieldKeys: string[] = Array.isArray(body?.fieldKeys)
    ? body.fieldKeys.filter((k: unknown) => typeof k === "string" && validKeys.has(k))
    : [];

  try {
    const model = await createModel({ name, fieldKeys });
    return NextResponse.json({ model }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("E11000")) {
      return NextResponse.json({ error: "A model with this name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create model" }, { status: 400 });
  }
}
