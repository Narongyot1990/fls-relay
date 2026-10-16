import { NextResponse } from "next/server";
import { importDevices } from "@/lib/db/queries";
import { canRegisterDevices } from "@/lib/permissions";
import type { Level } from "@/types";

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 *
 * Bulk-creates draft devices from a parsed CSV (see /devices/import). Each
 * row only needs a serial and a model name already in the catalog — IMEI and
 * phone number are intentionally not collected here (the source data never
 * has them) and get filled in later via PATCH /api/devices/[imei].
 */
export async function POST(request: Request) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canRegisterDevices(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { siteId, rows } = body ?? {};

  if (!siteId || typeof siteId !== "string") {
    return NextResponse.json({ error: "siteId is required" }, { status: 400 });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "At least one row is required" }, { status: 400 });
  }

  const cleanRows = rows
    .filter(
      (r): r is { serial: string; model: string } =>
        r && typeof r.serial === "string" && r.serial.trim() !== "" && typeof r.model === "string" && r.model.trim() !== "",
    )
    .map((r) => ({ serial: r.serial.trim(), model: r.model.trim() }));

  if (cleanRows.length === 0) {
    return NextResponse.json({ error: "No valid rows to import" }, { status: 400 });
  }

  try {
    const result = await importDevices(siteId, cleanRows);
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not import devices" }, { status: 400 });
  }
}
