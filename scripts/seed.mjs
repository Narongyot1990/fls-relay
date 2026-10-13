// One-time / re-runnable seed for initial sites, holders, and devices.
// Usage: node scripts/seed.mjs
//
// Upserts by each collection's natural key (site code, holder employeeNo,
// device imei) so running this again after real data exists won't duplicate
// anything — it only touches rows that still match these seed keys.

import { readFileSync, existsSync } from "fs";
import { MongoClient, ObjectId } from "mongodb";

function loadMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const envPath = new URL("../.env.local", import.meta.url);
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf8");
    const match = content.match(/^MONGODB_URI="?([^"\n]+)"?/m);
    if (match) return match[1];
  }
  throw new Error("MONGODB_URI not set and no .env.local found");
}

const SITES = [
  { code: "RYG", name: "Rayong site", active: true },
  { code: "CBI", name: "Chonburi site", active: true },
  { code: "LCB", name: "Laem Chabang site", active: true },
];

const MODELS = [
  { name: "Samsung Galaxy A07", active: true, fieldKeys: ["storageCapacity", "simType", "color"] },
];

const HOLDERS = [
  { employeeNo: "DRV-0142", type: "driver", name: "Somchai Jaidee", siteCode: "RYG", phone: "081-000-0142", active: true },
  { employeeNo: "DRV-0188", type: "driver", name: "Wichai Suksom", siteCode: "RYG", phone: "081-000-0188", active: true },
  { employeeNo: "DRV-0203", type: "driver", name: "Prasit Rungrueang", siteCode: "RYG", phone: "081-000-0203", active: true },
  { employeeNo: "DRV-0219", type: "driver", name: "Anan Srisuk", siteCode: "RYG", phone: "081-000-0219", active: true },
  { employeeNo: "SL-0010", type: "site_leader", name: "Somsak Kaewmanee", siteCode: "RYG", phone: "081-111-0010", active: true },
  { employeeNo: "SL-0022", type: "site_leader", name: "Duangjai Thongdee", siteCode: "CBI", phone: "081-111-0022", active: true },
  { employeeNo: "SL-0034", type: "site_leader", name: "Kittipong Wongsawat", siteCode: "LCB", phone: "081-111-0034", active: true },
];

const DEVICES = [
  { imei: "356938035241821", serial: "SNA07-0821", model: "Samsung Galaxy A07", phoneNumber: "089-120-0821", status: "in_site_stock", siteCode: "RYG", holderEmployeeNo: null,
    mdm: { deviceName: "GALAXY-A07-R83L30S4P1P", managedBy: "Intune", ownershipType: "corporate", managementMode: "dedicated", complianceState: "compliant", osPlatform: "Android", osVersion: "16", primaryUserUpn: null, lastCheckInAt: "2026-10-12T08:02:44+07:00", updatedAt: "2026-10-12T09:00:00+07:00", updatedBy: "Alex Tanner" } },
  { imei: "356938035241822", serial: "SNA07-0822", model: "Samsung Galaxy A07", phoneNumber: "089-120-0822", status: "in_site_stock", siteCode: "RYG", holderEmployeeNo: null, mdm: null },
  { imei: "356938035241823", serial: "SNA07-0823", model: "Samsung Galaxy A07", phoneNumber: "089-120-0823", status: "assigned", siteCode: "RYG", holderEmployeeNo: "DRV-0142",
    mdm: { deviceName: "GALAXY-A07-R83L30S4N9J", managedBy: "Intune", ownershipType: "corporate", managementMode: "dedicated", complianceState: "compliant", osPlatform: "Android", osVersion: "16", primaryUserUpn: null, lastCheckInAt: "2026-10-11T21:27:35+07:00", updatedAt: "2026-10-12T09:00:00+07:00", updatedBy: "Alex Tanner" } },
  { imei: "356938035241830", serial: "SNA07-0830", model: "Samsung Galaxy A07", phoneNumber: "089-120-0830", status: "assigned", siteCode: "RYG", holderEmployeeNo: "DRV-0188",
    mdm: { deviceName: "GALAXY-A07-R83L30S5REK", managedBy: "Intune", ownershipType: "corporate", managementMode: "dedicated", complianceState: "noncompliant", osPlatform: "Android", osVersion: "16", primaryUserUpn: null, lastCheckInAt: "2026-08-06T09:34:43+07:00", updatedAt: "2026-10-12T09:00:00+07:00", updatedBy: "Alex Tanner" } },
  { imei: "356938035241841", serial: "SNA07-0841", model: "Samsung Galaxy A07", phoneNumber: "089-120-0841", status: "returned", siteCode: "RYG", holderEmployeeNo: null, mdm: null },
  { imei: "356938035241852", serial: "SNA07-0852", model: "Samsung Galaxy A07", phoneNumber: "089-120-0852", status: "assigned", siteCode: "CBI", holderEmployeeNo: "SL-0022",
    mdm: { deviceName: "GALAXY-A07-R83L30S5SLL", managedBy: "Intune", ownershipType: "corporate", managementMode: "fully_managed", complianceState: "compliant", osPlatform: "Android", osVersion: "16", primaryUserUpn: "duangjai.t@fls-group.com", lastCheckInAt: "2026-10-12T03:30:58+07:00", updatedAt: "2026-10-12T09:00:00+07:00", updatedBy: "Alex Tanner" } },
];

async function main() {
  const uri = loadMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  try {
    const sites = db.collection("sites");
    const models = db.collection("models");
    const holders = db.collection("holders");
    const devices = db.collection("devices");

    await sites.createIndex({ code: 1 }, { unique: true });
    await models.createIndex({ name: 1 }, { unique: true });
    await holders.createIndex({ employeeNo: 1 }, { unique: true });
    await devices.createIndex({ imei: 1 }, { unique: true });
    await devices.createIndex({ serial: 1 }, { unique: true });

    for (const model of MODELS) {
      await models.findOneAndUpdate(
        { name: model.name },
        { $set: { active: model.active, fieldKeys: model.fieldKeys }, $setOnInsert: { _id: new ObjectId() } },
        { upsert: true, returnDocument: "after" },
      );
    }
    console.log(`Seeded ${MODELS.length} models`);

    const siteIdByCode = new Map();
    for (const site of SITES) {
      const result = await sites.findOneAndUpdate(
        { code: site.code },
        { $set: { name: site.name, active: site.active }, $setOnInsert: { _id: new ObjectId() } },
        { upsert: true, returnDocument: "after" },
      );
      siteIdByCode.set(site.code, result._id);
    }
    console.log(`Seeded ${SITES.length} sites`);

    const holderIdByEmployeeNo = new Map();
    for (const holder of HOLDERS) {
      const result = await holders.findOneAndUpdate(
        { employeeNo: holder.employeeNo },
        {
          $set: {
            type: holder.type,
            name: holder.name,
            siteId: siteIdByCode.get(holder.siteCode),
            phone: holder.phone,
            active: holder.active,
          },
          $setOnInsert: { _id: new ObjectId() },
        },
        { upsert: true, returnDocument: "after" },
      );
      holderIdByEmployeeNo.set(holder.employeeNo, result._id);
    }
    console.log(`Seeded ${HOLDERS.length} holders`);

    for (const device of DEVICES) {
      await devices.findOneAndUpdate(
        { imei: device.imei },
        {
          $set: {
            serial: device.serial,
            model: device.model,
            phoneNumber: device.phoneNumber,
            status: device.status,
            currentHolderId: device.holderEmployeeNo
              ? holderIdByEmployeeNo.get(device.holderEmployeeNo)
              : null,
            currentSiteId: siteIdByCode.get(device.siteCode),
            active: true,
            ...(device.mdm ? { mdm: device.mdm } : {}),
          },
          $setOnInsert: { _id: new ObjectId(), registeredAt: new Date() },
        },
        { upsert: true, returnDocument: "after" },
      );
    }
    console.log(`Seeded ${DEVICES.length} devices`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
