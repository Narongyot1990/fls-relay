import { ObjectId, type Collection } from "mongodb";
import { getDb } from "./mongodb";
import type { InventoryItem, ImportRow } from "@/lib/inventory";

export interface InventoryDoc {
  _id: ObjectId; deviceId?: string; deviceIdKey?: string; deviceName?: string;
  imei?: string; serial?: string; model?: string; phoneNumber?: string;
  status: string; currentSiteId: ObjectId | null; currentHolderId: ObjectId | null;
  registeredAt?: Date; active: boolean; importSource?: string;
  mdm?: Record<string, string | null>; lastActivity?: unknown;
  updatedAt?: Date;
}

export function inventoryItem(doc: InventoryDoc): InventoryItem {
  const activity = doc.lastActivity && typeof doc.lastActivity === "object" && "at" in doc.lastActivity ? doc.lastActivity.at : doc.lastActivity;
  const times = [doc.updatedAt, activity, doc.registeredAt].flatMap((value) => value instanceof Date || typeof value === "string" ? [new Date(value).getTime()] : []).filter(Number.isFinite);
  return { id: doc._id.toHexString(), deviceId: doc.deviceId ?? doc.imei ?? doc._id.toHexString(),
    deviceName: doc.deviceName ?? doc.mdm?.deviceName ?? "", imei: doc.imei ?? "", serial: doc.serial ?? "",
    model: doc.model ?? "", phoneNumber: doc.phoneNumber ?? "", status: doc.status,
    siteId: doc.currentSiteId?.toHexString() ?? null, holderId: doc.currentHolderId?.toHexString() ?? null,
    updatedAt: times.length ? new Date(Math.max(...times)).toISOString() : undefined,
    importSource: doc.importSource, mdm: doc.mdm ?? {} };
}
export async function inventoryCollection() { return (await getDb()).collection<InventoryDoc>("devices"); }

/** Called only by explicit write requests, never by reads or import preview. */
export async function ensureInventoryIndexes(collection: Collection<InventoryDoc>) {
  await collection.createIndex({ deviceIdKey: 1 }, { name: "inventory_device_id", unique: true, partialFilterExpression: { deviceIdKey: { $type: "string" } } });
  for (const field of ["imei", "serial"] as const) {
    const name = `inventory_optional_${field}`;
    await collection.createIndex({ [field]: 1 }, { name, unique: true, partialFilterExpression: { [field]: { $type: "string", $gt: "" } } });
    for (const index of await collection.indexes()) {
      if (index.name !== name && index.unique && !index.partialFilterExpression && !index.sparse &&
        Object.keys(index.key).length === 1 && index.key[field] === 1 && index.name) await collection.dropIndex(index.name);
    }
  }
}

export async function existingImportIds(rows: ImportRow[]) {
  const docs = await (await inventoryCollection()).find({ $or: [
    { deviceIdKey: { $in: rows.map((row) => row.deviceId.toLowerCase()) } },
    { deviceId: { $in: rows.map((row) => row.deviceId) } },
    { "mdm.deviceName": { $in: rows.map((row) => row.deviceName).filter(Boolean) } },
    { imei: { $in: rows.map((row) => row.deviceId) } },
  ] }).collation({ locale: "en", strength: 2 }).toArray();
  return new Set(docs.flatMap((doc) => [doc.deviceIdKey, doc.deviceId?.toLowerCase(), doc.mdm?.deviceName?.toLowerCase(), doc.imei?.toLowerCase()].filter((value): value is string => Boolean(value))));
}

export interface ManualDeviceInput {
  deviceId: string; deviceName?: string; model?: string; imei?: string; serial?: string; phoneNumber?: string;
}

export function manualDocument(input: ManualDeviceInput): InventoryDoc {
  return { _id: new ObjectId(), deviceId: input.deviceId, deviceIdKey: input.deviceId.toLowerCase(),
    deviceName: input.deviceName ?? "", model: input.model ?? "", imei: input.imei || undefined, serial: input.serial || undefined,
    phoneNumber: input.phoneNumber ?? "", status: "registered", currentSiteId: null, currentHolderId: null,
    registeredAt: new Date(), active: true, importSource: "manual", mdm: {} };
}

export function importDocument(row: ImportRow, filename: string, actor: string): InventoryDoc {
  const at = new Date().toISOString();
  return { _id: new ObjectId(), deviceId: row.deviceId, deviceIdKey: row.deviceId.toLowerCase(), deviceName: row.deviceName,
    model: "", phoneNumber: "", status: "registered", currentSiteId: null, currentHolderId: null,
    registeredAt: new Date(), active: true, importSource: filename,
    mdm: { deviceName: row.deviceName, managedBy: row.managedBy, ownershipType: row.ownership.toLowerCase() || "corporate",
      complianceState: ["compliant", "noncompliant"].includes(row.compliance.toLowerCase()) ? row.compliance.toLowerCase() : "unknown",
      osPlatform: row.os.split(" (")[0], managementMode: row.os.toLowerCase().includes("dedicated") ? "dedicated" : "fully_managed",
      osVersion: row.osVersion, primaryUserUpn: row.primaryUserUpn || null, lastCheckInAt: row.lastCheckIn || null, updatedAt: at, updatedBy: actor },
  };
}
