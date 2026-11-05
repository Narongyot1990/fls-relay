import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { inventoryCollection, inventoryItem } from "@/lib/db/inventory";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";

export async function GET(request: Request) {
  try {
    const access = await inventoryAccess(request);
    const requestedSite = new URL(request.url).searchParams.get("site") || "all";
    if (access.siteId && requestedSite !== "all" && requestedSite !== access.siteId) throw new InventoryError("This site is outside your assigned scope", 403);
    const site = access.siteId ?? requestedSite;
    if (!["all", "central"].includes(site) && !ObjectId.isValid(site)) throw new InventoryError("Invalid site");
    const siteQuery = site === "all" ? {} : { currentSiteId: site === "central" ? null : new ObjectId(site) };
    const db = await getDb();
    const [devices, sites, holders, leaders] = await Promise.all([
      (await inventoryCollection()).find({ active: true, ...siteQuery }).sort({ deviceId: 1, model: 1 }).toArray(),
      db.collection("sites").find(access.siteId ? { _id: new ObjectId(access.siteId) } : {}).toArray(),
      db.collection("holders").find(site !== "all" && site !== "central" ? { siteId: new ObjectId(site) } : site === "central" ? { _id: { $exists: false } } : {}).toArray(),
      db.collection("holders").find({ type: "site_leader", active: true, ...(access.siteId ? { _id: new ObjectId(access.actor) } : {}) }).toArray(),
    ]);
    const person = (item: typeof holders[number]) => ({ id: String(item._id), name: String(item.name), type: String(item.type), employeeNo: String(item.employeeNo ?? ""), siteId: String(item.siteId), active: item.active === true });
    return Response.json({ devices: devices.map(inventoryItem), sites: sites.map((item) => ({ id: String(item._id), name: String(item.name), active: item.active === true })), holders: holders.map(person), leaders: leaders.map(person), assignedSite: access.siteId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return inventoryFailure(error); }
}
