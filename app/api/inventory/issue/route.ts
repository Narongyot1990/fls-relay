import { getDb } from "@/lib/db/mongodb";
import { inventoryCollection, inventoryItem, ensureInventoryIndexes } from "@/lib/db/inventory";
import { transactionCollection, ensureTransactionIndexes } from "@/lib/db/transactions";
import { loadActiveDriver, loadIssuableDevice } from "@/lib/db/custody";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";
import { ObjectId } from "mongodb";

/** Persists the handover reviewed in HandoverReview.tsx: driver, device, signature and accessories. */
export async function POST(request: Request) {
  try {
    const access = await inventoryAccess(request, "custody");
    if (access.role === "it") throw new InventoryError("IT does not issue phones to drivers", 403);
    const body = await request.json();
    if (typeof body.signature !== "string" || !body.signature.trim()) throw new InventoryError("A signature is required");
    if (body.signature.length > 300000) throw new InventoryError("Signature image is too large");
    const accessories = Array.isArray(body.accessories) && body.accessories.every((item: unknown) => typeof item === "number") ? body.accessories : [];
    const policyVersion = typeof body.policyVersion === "string" ? body.policyVersion.slice(0, 120) : "";
    const db = await getDb();
    const driver = await loadActiveDriver(db, body.driverId);
    if (access.siteId && access.siteId !== driver.siteId.toHexString()) throw new InventoryError("This driver is outside your assigned site", 403);
    const devices = await inventoryCollection();
    await ensureInventoryIndexes(devices);
    const device = await loadIssuableDevice(devices, body.deviceId, driver.siteId);
    const transactions = await transactionCollection();
    await ensureTransactionIndexes(transactions);
    const at = new Date();
    const updated = await devices.findOneAndUpdate(
      { _id: device._id, active: true, currentHolderId: null },
      { $set: { status: "assigned", currentHolderId: driver._id, currentSiteId: driver.siteId, lastActivity: at } },
      { returnDocument: "after" },
    );
    if (!updated) throw new InventoryError("Device changed; reload before retrying", 409);
    await transactions.insertOne({
      _id: new ObjectId(), type: "issue", deviceId: device._id, fromSiteId: device.currentSiteId ?? null, toSiteId: driver.siteId,
      fromHolderId: null, toHolderId: driver._id, signature: body.signature, accessories, policyVersion,
      actorRole: access.role, actor: access.actor, at,
    });
    return Response.json({ device: inventoryItem(updated) }, { status: 201 });
  } catch (error) { return inventoryFailure(error); }
}
