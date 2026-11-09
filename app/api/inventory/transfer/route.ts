import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { inventoryCollection, inventoryItem, ensureInventoryIndexes } from "@/lib/db/inventory";
import { transactionCollection, ensureTransactionIndexes } from "@/lib/db/transactions";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";

/** Implementation sends central-stock devices to a site. Status becomes "in_transit"
 * until the receiving Site Leader confirms receipt — see /api/inventory/receipt. */
export async function POST(request: Request) {
  try {
    const access = await inventoryAccess(request, true);
    const body = await request.json();
    const deviceIds = Array.isArray(body.deviceIds) ? body.deviceIds : [];
    if (!deviceIds.length || deviceIds.some((id: unknown) => typeof id !== "string" || !ObjectId.isValid(id))) throw new InventoryError("Select at least one valid device");
    if (typeof body.toSiteId !== "string" || !ObjectId.isValid(body.toSiteId)) throw new InventoryError("Select a destination site");
    const toSiteId = new ObjectId(body.toSiteId);
    const db = await getDb();
    const site = await db.collection("sites").findOne({ _id: toSiteId, active: true });
    if (!site) throw new InventoryError("Destination site is not active");
    const devices = await inventoryCollection();
    await ensureInventoryIndexes(devices);
    const transactions = await transactionCollection();
    await ensureTransactionIndexes(transactions);
    const ids = deviceIds.map((id: string) => new ObjectId(id));
    const eligible = await devices.find({ _id: { $in: ids }, active: true, status: "registered", currentSiteId: null }).toArray();
    if (eligible.length !== ids.length) throw new InventoryError("Only central-stock devices with no custody activity can be transferred");
    const at = new Date();
    await devices.updateMany({ _id: { $in: ids } }, { $set: { status: "in_transit", currentSiteId: toSiteId, lastActivity: at } });
    await transactions.insertMany(eligible.map((device) => ({
      _id: new ObjectId(), type: "transfer" as const, deviceId: device._id, fromSiteId: null, toSiteId,
      fromHolderId: null, toHolderId: null, actorRole: access.role, actor: access.actor, at,
    })));
    const updated = await devices.find({ _id: { $in: ids } }).toArray();
    return Response.json({ devices: updated.map(inventoryItem) });
  } catch (error) { return inventoryFailure(error); }
}
