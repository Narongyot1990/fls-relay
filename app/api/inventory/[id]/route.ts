import { ObjectId } from "mongodb";
import { inventoryCollection, inventoryItem, ensureInventoryIndexes } from "@/lib/db/inventory";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await inventoryAccess(request, true);
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new InventoryError("Invalid record ID");
    const body = await request.json();
    const set: Record<string, string> = {}, unset: Record<string, ""> = {};
    for (const key of ["deviceId", "deviceName", "manufacturer", "model", "phoneNumber", "imei", "serial"]) {
      if (!(key in body)) continue;
      if (typeof body[key] !== "string" || body[key].trim().length > 200) throw new InventoryError(`Invalid ${key}`);
      const value = body[key].trim();
      if (key === "deviceId" && !value) throw new InventoryError("Device ID is required");
      if ((key === "imei" || key === "serial") && !value) unset[key] = "";
      else set[key] = value;
      if (key === "deviceId") set.deviceIdKey = value.toLowerCase();
    }
    if (!Object.keys(set).length && !Object.keys(unset).length) throw new InventoryError("No editable fields supplied");
    const collection = await inventoryCollection();
    const old = await collection.findOne({ _id: new ObjectId(id), active: true });
    if (!old) throw new InventoryError("Device not found", 404);
    if (set.deviceId && set.deviceId !== (old.deviceId ?? old.imei) && (old.lastActivity || old.currentSiteId || old.currentHolderId || old.status !== "registered")) throw new InventoryError("Device ID cannot change after custody activity", 409);
    if (set.deviceId) {
      const conflict = await collection.findOne({ _id: { $ne: old._id }, $or: [{ deviceIdKey: set.deviceIdKey }, { deviceId: set.deviceId }, { imei: set.deviceId }] });
      if (conflict) throw new InventoryError("Device ID already exists", 409);
    }
    await ensureInventoryIndexes(collection);
    const device = await collection.findOneAndUpdate({ _id: old._id, active: true }, { $set: { ...set, updatedAt: new Date() }, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { returnDocument: "after" });
    if (!device) throw new InventoryError("Device changed; reload before retrying", 409);
    return Response.json({ device: inventoryItem(device) });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return Response.json({ error: "Device ID, IMEI or serial already exists" }, { status: 409 });
    return inventoryFailure(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await inventoryAccess(request, true);
    const { id } = await params;
    if (!ObjectId.isValid(id)) throw new InventoryError("Invalid record ID");
    const result = await (await inventoryCollection()).deleteOne({ _id: new ObjectId(id), active: true, status: "registered", currentSiteId: null, currentHolderId: null, lastActivity: { $exists: false } });
    if (!result.deletedCount) throw new InventoryError("Only unused, unassigned registrations without custody history can be deleted", 409);
    return Response.json({ deleted: true });
  } catch (error) { return inventoryFailure(error); }
}
