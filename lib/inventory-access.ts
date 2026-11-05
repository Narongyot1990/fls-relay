import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { InventoryRole } from "@/lib/inventory";

export class InventoryError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** Temporary local test identity. Never allow role-switch headers in production. */
export async function inventoryAccess(request: Request, write = false) {
  if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") throw new InventoryError("Real authentication is required outside local development", 403);
  const role = request.headers.get("x-inventory-role") as InventoryRole | null;
  if (!role || !["it", "implementation", "site_leader", "system_admin"].includes(role)) throw new InventoryError("Select an operator role", 403);
  if (write && role !== "it" && role !== "implementation") throw new InventoryError("Only IT and Implementation may maintain inventory", 403);
  if (role !== "site_leader") return { role, siteId: null, actor: `local-${role}` };
  const id = request.headers.get("x-inventory-leader");
  if (!id || !ObjectId.isValid(id)) throw new InventoryError("Select an existing Site Leader", 403);
  const leader = await (await getDb()).collection("holders").findOne({ _id: new ObjectId(id), type: "site_leader", active: true });
  if (!leader?.siteId) throw new InventoryError("No active site affiliation for this Site Leader", 403);
  return { role, siteId: String(leader.siteId), actor: id };
}

export function inventoryFailure(error: unknown) {
  if (error instanceof InventoryError) return Response.json({ error: error.message }, { status: error.status });
  return Response.json({ error: "Database unavailable. Check MONGODB_URI and network access. No sample data is displayed." }, { status: 503 });
}
