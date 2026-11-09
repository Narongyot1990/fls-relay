import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { inventoryCollection, inventoryItem, ensureInventoryIndexes } from "@/lib/db/inventory";
import { transactionCollection, ensureTransactionIndexes } from "@/lib/db/transactions";
import { loadActiveDriver, loadAssignedDevice, loadIssuableDevice, readCondition, readAcknowledgement } from "@/lib/db/custody";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";
import { checkAccessoryReturn } from "@/lib/db/accessories";

/** Return, replacement assignment and both audit entries commit together. */
export async function POST(request: Request) {
  try {
    const access = await inventoryAccess(request, "custody");
    if (access.role === "it") throw new InventoryError("IT does not exchange phones with drivers", 403);
    const body = await request.json();
    const evidence = readAcknowledgement(body);
    const condition = readCondition(body.condition);
    const db = await getDb();
    const driver = await loadActiveDriver(db, body.driverId);
    if (access.siteId && access.siteId !== driver.siteId.toHexString()) throw new InventoryError("This driver is outside your assigned site", 403);
    const devices = await inventoryCollection();
    await ensureInventoryIndexes(devices);
    const transactions = await transactionCollection();
    await ensureTransactionIndexes(transactions);
    const at = new Date();
    const replacementRef = new ObjectId().toHexString();
    const result = await db.client.withSession((session) => session.withTransaction(async () => {
      const returning = await loadAssignedDevice(devices, body.returningDeviceId, driver._id, session);
      if (access.siteId && returning.currentSiteId?.toHexString() !== access.siteId) throw new InventoryError("This device is outside your assigned site", 403);
      const accessoryReturn = await checkAccessoryReturn(transactions, returning._id, driver._id, body, session);
      const incoming = await loadIssuableDevice(devices, body.newDeviceId, driver.siteId, session);
      if (returning._id.equals(incoming._id)) throw new InventoryError("Select a different device to issue");
      const returned = await devices.findOneAndUpdate(
        { _id: returning._id, active: true, status: "assigned", currentHolderId: driver._id },
        { $set: { status: condition === "damaged" ? "damaged" : "in_site_stock", currentHolderId: null, lastActivity: at } },
        { returnDocument: "after", session },
      );
      if (!returned) throw new InventoryError("Returning device changed; reload before retrying", 409);
      const issued = await devices.findOneAndUpdate(
        { _id: incoming._id, active: true, currentHolderId: null, status: incoming.status, currentSiteId: incoming.currentSiteId },
        { $set: { status: "assigned", currentHolderId: driver._id, currentSiteId: driver.siteId, lastActivity: at } },
        { returnDocument: "after", session },
      );
      if (!issued) throw new InventoryError("Incoming device changed; reload before retrying", 409);
      await transactions.insertMany([
        { _id: new ObjectId(), type: "return", deviceId: returning._id, fromSiteId: returning.currentSiteId ?? null, toSiteId: returning.currentSiteId ?? null,
          fromHolderId: driver._id, toHolderId: null, condition, replacementRef, ...accessoryReturn, actorRole: access.role, actor: access.actor, at },
        { _id: new ObjectId(), type: "issue", deviceId: incoming._id, fromSiteId: incoming.currentSiteId ?? null, toSiteId: driver.siteId,
          fromHolderId: null, toHolderId: driver._id, replacementRef, ...evidence, signerId: driver._id, signerName: driver.name, actorRole: access.role, actor: access.actor, at },
      ], { session });
      return { returned: inventoryItem(returned), issued: inventoryItem(issued) };
    }));
    return Response.json(result, { status: 201 });
  } catch (error) { return inventoryFailure(error); }
}
