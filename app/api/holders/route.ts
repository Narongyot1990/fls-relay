import { NextResponse } from "next/server";
import { listHolders } from "@/lib/db/queries";
import type { Holder } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId") ?? undefined;
  const type = (searchParams.get("type") as Holder["type"] | null) ?? undefined;

  try {
    const holders = await listHolders({ siteId, type });
    return NextResponse.json({ holders });
  } catch {
    return NextResponse.json({ error: "Invalid siteId" }, { status: 400 });
  }
}
