import { ObjectId } from "mongodb";
import { inventoryCollection, inventoryItem, ensureInventoryIndexes } from "@/lib/db/inventory";
import { transactionCollection, ensureTransactionIndexes } from "@/lib/db/transactions";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";

/** Site Leader confirms devices Implementation transferred — see /api/inventory/transfer. */
export async function POST(request: Request) {
  try {
    const access = await inventoryAccess(request, "custody");
    if (access.role !== "site_leader" || !access.siteId) throw new InventoryError("Only a Site Leader with an assigned site may confirm receipt", 403);
    const body = await request.json();
    const deviceIds = Array.isArray(body.deviceIds) ? body.deviceIds : [];
    if (!deviceIds.length || deviceIds.some((id: unknown) => typeof id !== "string" || !ObjectId.isValid(id))) throw new InventoryError("Select at least one valid device");
    const devices = await inventoryCollection();
    await ensureInventoryIndexes(devices);
    const transactions = await transactionCollection();
    await ensureTransactionIndexes(transactions);
    const siteId = new ObjectId(access.siteId);
    const ids = deviceIds.map((id: string) => new ObjectId(id));
    const eligible = await devices.find({ _id: { $in: ids }, active: true, status: "in_transit", currentSiteId: siteId }).toArray();
    if (eligible.length !== ids.length) throw new InventoryError("Only devices in transit to your site can be confirmed");
    const at = new Date();
    await devices.updateMany({ _id: { $in: ids } }, { $set: { status: "in_site_stock", lastActivity: at } });
    await transactions.insertMany(eligible.map((device) => ({
      _id: new ObjectId(), type: "receipt" as const, deviceId: device._id, fromSiteId: null, toSiteId: siteId,
      fromHolderId: null, toHolderId: null, actorRole: access.role, actor: access.actor, at,
    })));
    const updated = await devices.find({ _id: { $in: ids } }).toArray();
    return Response.json({ devices: updated.map(inventoryItem) });
  } catch (error) { return inventoryFailure(error); }
}
