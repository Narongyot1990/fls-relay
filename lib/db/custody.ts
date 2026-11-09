import { ObjectId, type ClientSession, type Collection, type Db } from "mongodb";
import type { InventoryDoc } from "./inventory";
import { InventoryError } from "@/lib/inventory-access";
import { recordedAccessories } from "@/lib/accessories";

/** Shared eligibility checks for issue/return/exchange — see app/api/inventory/{issue,return,exchange}/route.ts. */
export async function loadActiveDriver(db: Db, driverId: unknown) {
  if (typeof driverId !== "string" || !ObjectId.isValid(driverId)) throw new InventoryError("Select an existing driver");
  const driver = await db.collection("holders").findOne({ _id: new ObjectId(driverId), type: "driver", active: true });
  if (!driver?.siteId) throw new InventoryError("Select an existing active driver with an assigned site");
  return driver as { _id: ObjectId; siteId: ObjectId; name: string };
}

/** Matches the spec's T2 transition: registered+central or in_site_stock at the driver's own site. */
export async function loadIssuableDevice(devices: Collection<InventoryDoc>, deviceId: unknown, driverSiteId: ObjectId, session?: ClientSession) {
  if (typeof deviceId !== "string" || !ObjectId.isValid(deviceId)) throw new InventoryError("Select an existing device");
  const device = await devices.findOne({
    _id: new ObjectId(deviceId), active: true, currentHolderId: null,
    $or: [{ status: "registered", currentSiteId: null }, { status: "in_site_stock", currentSiteId: driverSiteId }],
  }, { session });
  if (!device) throw new InventoryError("This device is not eligible for issue to this driver", 409);
  return device;
}

export async function loadAssignedDevice(devices: Collection<InventoryDoc>, deviceId: unknown, holderId: ObjectId, session?: ClientSession) {
  if (typeof deviceId !== "string" || !ObjectId.isValid(deviceId)) throw new InventoryError("Select an existing device");
  const device = await devices.findOne({ _id: new ObjectId(deviceId), active: true, status: "assigned", currentHolderId: holderId }, { session });
  if (!device) throw new InventoryError("This device is not currently assigned to this driver", 409);
  return device;
}

export function readCondition(value: unknown): "ok" | "damaged" {
  if (value !== "ok" && value !== "damaged") throw new InventoryError("Select a return condition");
  return value;
}

export function readAcknowledgement(body: Record<string, unknown>) {
  if (typeof body.signature !== "string" || !body.signature.startsWith("data:image/png;base64,") || body.signature.length > 300000 || body.signature.length < 50) throw new InventoryError("A valid driver signature is required");
  if (body.acknowledged !== true) throw new InventoryError("Driver acknowledgement is required");
  if (body.policyLanguage !== "en" && body.policyLanguage !== "th") throw new InventoryError("Select the policy language");
  if (body.policyVersion !== "Professional_Smartphone_Handover_Bilingual_EN_TH-v1") throw new InventoryError("Unsupported policy version");
  const accessories = recordedAccessories(body.accessories ?? []);
  if (!accessories) throw new InventoryError("Select valid accessories from the handover checklist");
  return { signature: body.signature, policyLanguage: body.policyLanguage as "en" | "th", policyVersion: body.policyVersion, accessories };
}
