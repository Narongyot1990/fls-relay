import { ObjectId } from "mongodb";
import { inventoryCollection, inventoryItem, ensureInventoryIndexes } from "@/lib/db/inventory";
import { transactionCollection, ensureTransactionIndexes } from "@/lib/db/transactions";
import { readCondition } from "@/lib/db/custody";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";

/** Closes an active driver assignment; a damaged return does not return to issuable stock. */
export async function POST(request: Request) {
  try {
    const access = await inventoryAccess(request, "custody");
    if (access.role === "it") throw new InventoryError("IT does not take back phones from drivers", 403);
    const body = await request.json();
    const condition = readCondition(body.condition);
    if (typeof body.deviceId !== "string" || !ObjectId.isValid(body.deviceId)) throw new InventoryError("Select an existing device");
    const devices = await inventoryCollection();
    await ensureInventoryIndexes(devices);
    const device = await devices.findOne({ _id: new ObjectId(body.deviceId), active: true, status: "assigned" });
    if (!device) throw new InventoryError("This device is not currently assigned", 409);
    if (access.siteId && device.currentSiteId?.toHexString() !== access.siteId) throw new InventoryError("This device is outside your assigned site", 403);
    const transactions = await transactionCollection();
    await ensureTransactionIndexes(transactions);
    const at = new Date();
    const updated = await devices.findOneAndUpdate(
      { _id: device._id, active: true, status: "assigned" },
      { $set: { status: condition === "damaged" ? "damaged" : "in_site_stock", currentHolderId: null, lastActivity: at } },
      { returnDocument: "after" },
    );
    if (!updated) throw new InventoryError("Device changed; reload before retrying", 409);
    await transactions.insertOne({
      _id: new ObjectId(), type: "return", deviceId: device._id, fromSiteId: device.currentSiteId ?? null, toSiteId: device.currentSiteId ?? null,
      fromHolderId: device.currentHolderId ?? null, toHolderId: null, condition, actorRole: access.role, actor: access.actor, at,
    });
    return Response.json({ device: inventoryItem(updated) });
  } catch (error) { return inventoryFailure(error); }
}
