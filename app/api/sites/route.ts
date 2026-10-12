import { NextResponse } from "next/server";
import { listSites } from "@/lib/db/queries";

export async function GET() {
  const sites = await listSites();
  return NextResponse.json({ sites });
}
