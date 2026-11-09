import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { inventoryCollection, inventoryItem, ensureInventoryIndexes } from "@/lib/db/inventory";
import { transactionCollection, ensureTransactionIndexes } from "@/lib/db/transactions";
import { loadActiveDriver, loadAssignedDevice, loadIssuableDevice, readCondition } from "@/lib/db/custody";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";

/** One linked operation: close the driver's current assignment and open a new one.
 * No DB session/transaction in this round — if the second write fails after the
 * first succeeds, the returning device's status is reverted on a best-effort basis. */
export async function POST(request: Request) {
  try {
    const access = await inventoryAccess(request, "custody");
    if (access.role === "it") throw new InventoryError("IT does not exchange phones with drivers", 403);
    const body = await request.json();
    const condition = readCondition(body.condition);
    const db = await getDb();
    const driver = await loadActiveDriver(db, body.driverId);
    if (access.siteId && access.siteId !== driver.siteId.toHexString()) throw new InventoryError("This driver is outside your assigned site", 403);
    const devices = await inventoryCollection();
    await ensureInventoryIndexes(devices);
    const returning = await loadAssignedDevice(devices, body.returningDeviceId, driver._id);
    const incoming = await loadIssuableDevice(devices, body.newDeviceId, driver.siteId);
    if (returning._id.equals(incoming._id)) throw new InventoryError("Select a different device to issue");
    const transactions = await transactionCollection();
    await ensureTransactionIndexes(transactions);
    const at = new Date();
    const replacementRef = new ObjectId().toHexString();
    const returned = await devices.findOneAndUpdate(
      { _id: returning._id, active: true, status: "assigned", currentHolderId: driver._id },
      { $set: { status: condition === "damaged" ? "damaged" : "in_site_stock", currentHolderId: null, lastActivity: at } },
      { returnDocument: "after" },
    );
    if (!returned) throw new InventoryError("Returning device changed; reload before retrying", 409);
    let issued;
    try {
      issued = await devices.findOneAndUpdate(
        { _id: incoming._id, active: true, currentHolderId: null },
        { $set: { status: "assigned", currentHolderId: driver._id, currentSiteId: driver.siteId, lastActivity: at } },
        { returnDocument: "after" },
      );
      if (!issued) throw new InventoryError("Incoming device changed; reload before retrying", 409);
    } catch (cause) {
      await devices.updateOne({ _id: returning._id }, { $set: { status: "assigned", currentHolderId: driver._id, lastActivity: returning.lastActivity ?? null } });
      throw cause;
    }
    await transactions.insertMany([
      { _id: new ObjectId(), type: "return", deviceId: returning._id, fromSiteId: returning.currentSiteId ?? null, toSiteId: returning.currentSiteId ?? null,
        fromHolderId: driver._id, toHolderId: null, condition, replacementRef, actorRole: access.role, actor: access.actor, at },
      { _id: new ObjectId(), type: "issue", deviceId: incoming._id, fromSiteId: incoming.currentSiteId ?? null, toSiteId: driver.siteId,
        fromHolderId: null, toHolderId: driver._id, replacementRef, actorRole: access.role, actor: access.actor, at },
    ]);
    return Response.json({ returned: inventoryItem(returned), issued: inventoryItem(issued) }, { status: 201 });
  } catch (error) { return inventoryFailure(error); }
}
