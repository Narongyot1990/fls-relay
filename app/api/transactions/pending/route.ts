import { NextResponse } from "next/server";
import { listPendingIssueTransactions } from "@/lib/db/queries";

/**
 * Open read, same as /api/devices, /api/sites etc. — there's no real
 * per-user server-side scoping without real auth, so the client filters
 * down to what it can act on (see lib/permissions.ts's canConfirmIssue).
 */
export async function GET() {
  const transactions = await listPendingIssueTransactions();
  return NextResponse.json({ transactions });
}
