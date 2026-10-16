import { NextResponse } from "next/server";
import { confirmIssueTransaction, getTransactionById } from "@/lib/db/queries";
import type { Level } from "@/types";

/**
 * There is no session/auth yet, so the caller's role (and claimed site, for
 * the L2 own-site check) travel as headers from the (dev-only) current-user
 * context — see lib/api-client.ts. Not a real permission check, same as
 * every other write route in this app.
 *
 * Only the destination site's own leader, or Management, may confirm — L3
 * is the sender here, and two-sided confirmation requires the receiver to
 * be someone else.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const level = request.headers.get("x-user-level") as Level | null;
  const claimedSiteId = request.headers.get("x-user-site-id") || null;
  const userId = request.headers.get("x-user-id") ?? "unknown";

  const { id } = await params;
  const tx = await getTransactionById(id);
  if (!tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });

  const toSiteId = tx.toSiteId.toHexString();
  const allowed = level === "L4" || (level === "L2" && claimedSiteId === toSiteId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const confirmedByName = typeof body?.confirmedByName === "string" ? body.confirmedByName : "Unknown";

  const result = await confirmIssueTransaction(id, { confirmedById: userId, confirmedByName });
  if (result.error === "not_found") return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  if (result.error === "not_pending") {
    return NextResponse.json({ error: "This has already been confirmed or rejected" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
