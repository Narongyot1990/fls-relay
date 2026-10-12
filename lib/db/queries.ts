import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { deviceFromDoc, holderFromDoc, modelFromDoc, siteFromDoc } from "./mappers";
import type { DeviceDoc, HolderDoc, ModelDoc, SiteDoc } from "./documents";
import type { Device, DeviceMdmInfo, DeviceModel, DeviceStatus, Holder, Site } from "@/types";

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

export async function listSites(): Promise<Site[]> {
  const docs = await (await sitesCollection()).find().sort({ name: 1 }).toArray();
  return docs.map(siteFromDoc);
}

export async function getSiteById(id: string): Promise<Site | null> {
  const doc = await (await sitesCollection()).findOne({ _id: new ObjectId(id) });
  return doc ? siteFromDoc(doc) : null;
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

export async function listModels(): Promise<DeviceModel[]> {
  const docs = await (await modelsCollection()).find({ active: true }).sort({ name: 1 }).toArray();
  return docs.map(modelFromDoc);
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

export async function listHolders(filter: { siteId?: string; type?: Holder["type"] } = {}): Promise<Holder[]> {
  const query: Record<string, unknown> = { active: true };
  if (filter.siteId) query.siteId = new ObjectId(filter.siteId);
  if (filter.type) query.type = filter.type;
  const docs = await (await holdersCollection()).find(query).sort({ name: 1 }).toArray();
  return docs.map(holderFromDoc);
}

export async function getHolderById(id: string): Promise<Holder | null> {
  const doc = await (await holdersCollection()).findOne({ _id: new ObjectId(id) });
  return doc ? holderFromDoc(doc) : null;
}

export async function listDevices(filter: { siteId?: string; status?: DeviceStatus } = {}): Promise<Device[]> {
  const query: Record<string, unknown> = { active: true };
  if (filter.siteId) query.currentSiteId = new ObjectId(filter.siteId);
  if (filter.status) query.status = filter.status;
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
