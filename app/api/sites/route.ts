import { NextResponse } from "next/server";
import { createSite, listSites } from "@/lib/db/queries";
import { canManageCatalog } from "@/lib/permissions";
import type { Level } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get("activeOnly") === "1";
  const sites = await listSites({ activeOnly });
  return NextResponse.json({ sites });
}

/**
 * There is no session/auth yet, so the caller's role travels as a header the
 * client sets from its (dev-only) current-user context. This is NOT a real
 * permission check — a client can send any value — it only exists so the
 * server-side gate is already wired in the right shape once real auth lands.
 */
export async function POST(request: Request) {
  const level = request.headers.get("x-user-level") as Level | null;
  if (!level || !canManageCatalog(level)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Site name is required" }, { status: 400 });
  }

  try {
    const site = await createSite({ name });
    return NextResponse.json({ site }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create site" }, { status: 400 });
  }
}
