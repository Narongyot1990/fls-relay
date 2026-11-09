import { ObjectId, type Collection, type Db } from "mongodb";
import type { InventoryDoc } from "./inventory";
import { InventoryError } from "@/lib/inventory-access";

/** Shared eligibility checks for issue/return/exchange — see app/api/inventory/{issue,return,exchange}/route.ts. */
export async function loadActiveDriver(db: Db, driverId: unknown) {
  if (typeof driverId !== "string" || !ObjectId.isValid(driverId)) throw new InventoryError("Select an existing driver");
  const driver = await db.collection("holders").findOne({ _id: new ObjectId(driverId), type: "driver", active: true });
  if (!driver?.siteId) throw new InventoryError("Select an existing active driver with an assigned site");
  return driver as { _id: ObjectId; siteId: ObjectId; name: string };
}

/** Matches the spec's T2 transition: registered+central or in_site_stock at the driver's own site. */
export async function loadIssuableDevice(devices: Collection<InventoryDoc>, deviceId: unknown, driverSiteId: ObjectId) {
  if (typeof deviceId !== "string" || !ObjectId.isValid(deviceId)) throw new InventoryError("Select an existing device");
  const device = await devices.findOne({
    _id: new ObjectId(deviceId), active: true, currentHolderId: null,
    $or: [{ status: "registered", currentSiteId: null }, { status: "in_site_stock", currentSiteId: driverSiteId }],
  });
  if (!device) throw new InventoryError("This device is not eligible for issue to this driver", 409);
  return device;
}

export async function loadAssignedDevice(devices: Collection<InventoryDoc>, deviceId: unknown, holderId: ObjectId) {
  if (typeof deviceId !== "string" || !ObjectId.isValid(deviceId)) throw new InventoryError("Select an existing device");
  const device = await devices.findOne({ _id: new ObjectId(deviceId), active: true, status: "assigned", currentHolderId: holderId });
  if (!device) throw new InventoryError("This device is not currently assigned to this driver", 409);
  return device;
}

export function readCondition(value: unknown): "ok" | "damaged" {
  if (value !== "ok" && value !== "damaged") throw new InventoryError("Select a return condition");
  return value;
}
