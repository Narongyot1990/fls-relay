import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { deviceFromDoc, holderFromDoc, modelFromDoc, siteFromDoc } from "./mappers";
import type { DeviceDoc, HolderDoc, ModelDoc, SiteDoc } from "./documents";
import type { Device, DeviceMdmInfo, DeviceModel, DeviceStatus, Holder, ModelImage, Site } from "@/types";

async function sitesCollection() {
  return (await getDb()).collection<SiteDoc>("sites");
}

async function modelsCollection() {
  return (await getDb()).collection<ModelDoc>("models");
}

async function holdersCollection() {
  return (await getDb()).collection<HolderDoc>("holders");
}

async function devicesCollection() {
  return (await getDb()).collection<DeviceDoc>("devices");
}

export async function listSites(filter: { activeOnly?: boolean } = {}): Promise<Site[]> {
  const query: Record<string, unknown> = {};
  if (filter.activeOnly) query.active = true;
  const docs = await (await sitesCollection()).find(query).sort({ name: 1 }).toArray();
  return docs.map(siteFromDoc);
}

export async function getSiteById(id: string): Promise<Site | null> {
  const doc = await (await sitesCollection()).findOne({ _id: new ObjectId(id) });
  return doc ? siteFromDoc(doc) : null;
}

export async function setSiteActive(id: string, active: boolean): Promise<Site | null> {
  const collection = await sitesCollection();
  await collection.updateOne({ _id: new ObjectId(id) }, { $set: { active } });
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  return doc ? siteFromDoc(doc) : null;
}

/** Counts the holders and devices still pointing at this site, so deletion can refuse to orphan them. */
export async function countSiteReferences(siteId: string): Promise<{ holders: number; devices: number }> {
  const oid = new ObjectId(siteId);
  const holders = await (await holdersCollection()).countDocuments({ siteId: oid });
  const devices = await (await devicesCollection()).countDocuments({ currentSiteId: oid });
  return { holders, devices };
}

export async function deleteSite(
  id: string,
): Promise<{ deleted: boolean; holders: number; devices: number }> {
  const { holders, devices } = await countSiteReferences(id);
  if (holders > 0 || devices > 0) {
    return { deleted: false, holders, devices };
  }
  await (await sitesCollection()).deleteOne({ _id: new ObjectId(id) });
  return { deleted: true, holders: 0, devices: 0 };
}

export interface CreateSiteInput {
  name: string;
}

/** Derives a short unique code from the name (e.g. "Pattaya site" -> "PATTAYA-SITE"), retrying on collision. */
export async function createSite(input: CreateSiteInput): Promise<Site> {
  const collection = await sitesCollection();
  await collection.createIndex({ code: 1 }, { unique: true });

  const name = input.name.trim();
  const base =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "SITE";

  for (let attempt = 1; attempt <= 5; attempt++) {
    const code = attempt === 1 ? base : `${base}-${attempt}`;
    try {
      const doc: SiteDoc = { _id: new ObjectId(), code, name, active: true };
      await collection.insertOne(doc);
      return siteFromDoc(doc);
    } catch (err) {
      if (err instanceof Error && err.message.includes("E11000") && attempt < 5) continue;
      throw err;
    }
  }
  throw new Error("Could not generate a unique site code");
}

export async function listModels(filter: { activeOnly?: boolean } = {}): Promise<DeviceModel[]> {
  const query: Record<string, unknown> = {};
  if (filter.activeOnly) query.active = true;
  const docs = await (await modelsCollection()).find(query).sort({ name: 1 }).toArray();
  return docs.map(modelFromDoc);
}

export async function getModelById(id: string): Promise<DeviceModel | null> {
  const doc = await (await modelsCollection()).findOne({ _id: new ObjectId(id) });
  return doc ? modelFromDoc(doc) : null;
}

export async function setModelActive(id: string, active: boolean): Promise<DeviceModel | null> {
  const collection = await modelsCollection();
  await collection.updateOne({ _id: new ObjectId(id) }, { $set: { active } });
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  return doc ? modelFromDoc(doc) : null;
}

export async function deleteModel(id: string): Promise<{ deleted: boolean; devices: number }> {
  const model = await getModelById(id);
  if (!model) return { deleted: false, devices: 0 };
  const devices = await (await devicesCollection()).countDocuments({ model: model.name });
  if (devices > 0) return { deleted: false, devices };
  await (await modelsCollection()).deleteOne({ _id: new ObjectId(id) });
  return { deleted: true, devices: 0 };
}

export async function addModelImage(id: string, image: ModelImage): Promise<DeviceModel | null> {
  const collection = await modelsCollection();
  await collection.updateOne({ _id: new ObjectId(id) }, { $push: { images: image } });
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  return doc ? modelFromDoc(doc) : null;
}

export async function removeModelImage(id: string, url: string): Promise<DeviceModel | null> {
  const collection = await modelsCollection();
  await collection.updateOne({ _id: new ObjectId(id) }, { $pull: { images: { url } } });
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  return doc ? modelFromDoc(doc) : null;
}

export interface CreateModelInput {
  name: string;
  fieldKeys: string[];
}

export async function createModel(input: CreateModelInput): Promise<DeviceModel> {
  const collection = await modelsCollection();
  await collection.createIndex({ name: 1 }, { unique: true });

  const doc: ModelDoc = {
    _id: new ObjectId(),
    name: input.name.trim(),
    active: true,
    fieldKeys: input.fieldKeys,
  };
  await collection.insertOne(doc);
  return modelFromDoc(doc);
}

/**
 * Default is active-only (opposite default from listSites/listModels' activeOnly flag) —
 * hand-out/take-back/swap pickers and the dynamic role-switcher all rely on separated/
 * deactivated staff staying out of the result by default. Only the admin page passes
 * includeInactive: true, so it can see rows to reactivate them.
 */
export async function listHolders(
  filter: { siteId?: string; type?: Holder["type"]; includeInactive?: boolean } = {},
): Promise<Holder[]> {
  const query: Record<string, unknown> = {};
  if (!filter.includeInactive) query.active = true;
  if (filter.siteId) query.siteId = new ObjectId(filter.siteId);
  if (filter.type) query.type = filter.type;
  const docs = await (await holdersCollection()).find(query).sort({ name: 1 }).toArray();
  return docs.map(holderFromDoc);
}

export async function getHolderById(id: string): Promise<Holder | null> {
  const doc = await (await holdersCollection()).findOne({ _id: new ObjectId(id) });
  return doc ? holderFromDoc(doc) : null;
}

export interface CreateHolderInput {
  type: Holder["type"];
  name: string;
  employeeNo: string;
  siteId: string;
  phone: string;
}

export async function createHolder(input: CreateHolderInput): Promise<Holder> {
  const collection = await holdersCollection();
  await collection.createIndex({ employeeNo: 1 }, { unique: true });

  const doc: HolderDoc = {
    _id: new ObjectId(),
    type: input.type,
    name: input.name.trim(),
    employeeNo: input.employeeNo.trim(),
    siteId: new ObjectId(input.siteId),
    phone: input.phone.trim(),
    active: true,
  };
  await collection.insertOne(doc);
  return holderFromDoc(doc);
}

/** Counts devices currently assigned to this holder, so deactivate/delete can refuse to orphan the custody link. */
export async function countHolderReferences(holderId: string): Promise<number> {
  return (await devicesCollection()).countDocuments({ currentHolderId: new ObjectId(holderId) });
}

export async function setHolderActive(
  id: string,
  active: boolean,
): Promise<{ holder: Holder | null; blockedDevices: number }> {
  if (!active) {
    const blockedDevices = await countHolderReferences(id);
    if (blockedDevices > 0) return { holder: null, blockedDevices };
  }
  const collection = await holdersCollection();
  await collection.updateOne({ _id: new ObjectId(id) }, { $set: { active } });
  const doc = await collection.findOne({ _id: new ObjectId(id) });
  return { holder: doc ? holderFromDoc(doc) : null, blockedDevices: 0 };
}

export async function deleteHolder(id: string): Promise<{ deleted: boolean; devices: number }> {
  const devices = await countHolderReferences(id);
  if (devices > 0) return { deleted: false, devices };
  await (await holdersCollection()).deleteOne({ _id: new ObjectId(id) });
  return { deleted: true, devices: 0 };
}

export async function listDevices(
  filter: { siteId?: string; status?: DeviceStatus; holderId?: string } = {},
): Promise<Device[]> {
  const query: Record<string, unknown> = { active: true };
  if (filter.siteId) query.currentSiteId = new ObjectId(filter.siteId);
  if (filter.status) query.status = filter.status;
  if (filter.holderId) query.currentHolderId = new ObjectId(filter.holderId);
  const docs = await (await devicesCollection()).find(query).sort({ model: 1 }).toArray();
  return docs.map(deviceFromDoc);
}

export async function getDeviceByImei(imei: string): Promise<Device | null> {
  const doc = await (await devicesCollection()).findOne({ imei });
  return doc ? deviceFromDoc(doc) : null;
}

export interface CreateDeviceInput {
  imei: string;
  serial: string;
  model: string;
  phoneNumber: string;
  siteId: string;
  customFields?: Record<string, string>;
}

export async function createDevice(input: CreateDeviceInput): Promise<Device> {
  const doc: DeviceDoc = {
    _id: new ObjectId(),
    imei: input.imei,
    serial: input.serial,
    model: input.model,
    phoneNumber: input.phoneNumber,
    status: "registered",
    currentHolderId: null,
    currentSiteId: new ObjectId(input.siteId),
    registeredAt: new Date(),
    active: true,
    ...(input.customFields && Object.keys(input.customFields).length > 0
      ? { customFields: input.customFields }
      : {}),
  };
  await (await devicesCollection()).insertOne(doc);
  return deviceFromDoc(doc);
}

export async function updateDeviceMdm(imei: string, mdm: DeviceMdmInfo): Promise<Device | null> {
  const collection = await devicesCollection();
  await collection.updateOne({ imei }, { $set: { mdm } });
  const doc = await collection.findOne({ imei });
  return doc ? deviceFromDoc(doc) : null;
}

/**
 * Hard delete — only for undoing a pure mis-registration (never touched since
 * creation). Anything with real custody history must be retired, never deleted,
 * per the spec's "never delete historical records" principle.
 */
export async function deleteDevice(imei: string): Promise<{ deleted: boolean }> {
  const collection = await devicesCollection();
  const result = await collection.deleteOne({ imei, status: "registered", currentHolderId: null });
  return { deleted: result.deletedCount > 0 };
}

/**
 * Soft, terminal lifecycle action. Matches the spec's state-machine table exactly:
 * retire is only reachable from in_site_stock or returned, never from assigned
 * (the device must be taken back first).
 */
export async function retireDevice(imei: string): Promise<{ retired: boolean }> {
  const collection = await devicesCollection();
  const result = await collection.updateOne(
    { imei, status: { $in: ["in_site_stock", "returned"] } },
    { $set: { status: "retired" } },
  );
  return { retired: result.modifiedCount > 0 };
}
