import { withAssignments } from "@/lib/db/accessories";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { inventoryCollection, inventoryItem, ensureInventoryIndexes, manualDocument } from "@/lib/db/inventory";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";
import { summarizeSites } from "@/lib/site-tracking";

export async function GET(request: Request) {
  try {
    const access = await inventoryAccess(request);
    const requestedSite = new URL(request.url).searchParams.get("site") || "all";
    if (access.siteId && requestedSite !== "all" && requestedSite !== access.siteId) throw new InventoryError("This site is outside your assigned scope", 403);
    const site = access.siteId ?? requestedSite;
    if (!["all", "central"].includes(site) && !ObjectId.isValid(site)) throw new InventoryError("Invalid site");
    const siteQuery = site === "all" ? {} : { currentSiteId: site === "central" ? null : new ObjectId(site) };
    const db = await getDb();
    const [devices, sites, holders, leaders, assignedDevices, summaryDevices, summaryDrivers] = await Promise.all([
      (await inventoryCollection()).find({ active: true, ...siteQuery }).sort({ deviceId: 1, model: 1 }).toArray(),
      db.collection("sites").find(access.siteId ? { _id: new ObjectId(access.siteId) } : {}).toArray(),
      db.collection("holders").find(site !== "all" && site !== "central" ? { siteId: new ObjectId(site) } : {}).toArray(),
      db.collection("holders").find({ type: "site_leader", active: true, ...(access.siteId ? { _id: new ObjectId(access.actor) } : {}) }).toArray(),
      (await inventoryCollection()).find({ active: true, status: "assigned", ...(site === "central" ? {} : siteQuery) }).toArray(),
      db.collection("devices").find({ active: true, ...(access.siteId ? { currentSiteId: new ObjectId(access.siteId) } : {}) }, { projection: { currentSiteId: 1, currentHolderId: 1, status: 1 } }).toArray(),
      db.collection("holders").find({ type: "driver", active: true, ...(access.siteId ? { siteId: new ObjectId(access.siteId) } : {}) }, { projection: { siteId: 1, type: 1, active: 1 } }).toArray(),
    ]);
    const enrichedAssignments = await withAssignments(assignedDevices.map(inventoryItem));
    const assignmentById = new Map(enrichedAssignments.map((item) => [item.id, item]));
    const siteSummaries = summarizeSites(
      summaryDevices.map((item) => ({ siteId: item.currentSiteId ? String(item.currentSiteId) : null, holderId: item.currentHolderId ? String(item.currentHolderId) : null, status: String(item.status) })),
      sites.map((item) => ({ id: String(item._id), code: String(item.code || ""), name: String(item.name || ""), active: item.active === true })),
      summaryDrivers.map((item) => ({ id: String(item._id), siteId: String(item.siteId), type: String(item.type), active: item.active === true })), !access.siteId,
    );
    const person = (item: typeof holders[number]) => ({ id: String(item._id), name: String(item.name), type: String(item.type), employeeNo: String(item.employeeNo ?? ""), siteId: String(item.siteId), phone: String(item.phone ?? ""), active: item.active === true });
    return Response.json({ siteSummaries, devices: devices.map((doc) => assignmentById.get(doc._id.toHexString()) || inventoryItem(doc)), assignedDevices: enrichedAssignments, sites: sites.map((item) => ({ id: String(item._id), code: String(item.code ?? ""), name: String(item.name), active: item.active === true })), holders: holders.map(person), leaders: leaders.map(person), assignedSite: access.siteId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return inventoryFailure(error); }
}

/** Manual single-device add — the non-bulk counterpart to /api/inventory/import. */
export async function POST(request: Request) {
  try {
    await inventoryAccess(request, true);
    const body = await request.json();
    const fields = ["deviceId", "deviceName", "manufacturer", "model", "imei", "serial", "phoneNumber"] as const;
    const input: Partial<Record<(typeof fields)[number], string>> = {};
    for (const key of fields) {
      if (!(key in body)) continue;
      if (typeof body[key] !== "string" || body[key].trim().length > 200) throw new InventoryError(`Invalid ${key}`);
      input[key] = body[key].trim();
    }
    if (!input.deviceId) throw new InventoryError("Device ID is required");
    const collection = await inventoryCollection();
    const conflict = await collection.findOne({ $or: [{ deviceIdKey: input.deviceId.toLowerCase() }, { deviceId: input.deviceId }, { imei: input.deviceId }] });
    if (conflict) throw new InventoryError("Device ID already exists", 409);
    await ensureInventoryIndexes(collection);
    const doc = manualDocument({ ...input, deviceId: input.deviceId });
    await collection.insertOne(doc);
    return Response.json({ device: inventoryItem(doc) }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return Response.json({ error: "Device ID, IMEI or serial already exists" }, { status: 409 });
    return inventoryFailure(error);
  }
}
