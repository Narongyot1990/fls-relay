import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { transactionCollection, custodyTransactionItem } from "@/lib/db/transactions";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";

const LIMIT = 200;

export async function GET(request: Request) {
  try {
    const access = await inventoryAccess(request);
    const requestedSite = new URL(request.url).searchParams.get("site") || "all";
    if (access.siteId && requestedSite !== "all" && requestedSite !== access.siteId) throw new InventoryError("This site is outside your assigned scope", 403);
    const site = access.siteId ?? requestedSite;
    if (!["all", "central"].includes(site) && !ObjectId.isValid(site)) throw new InventoryError("Invalid site");
    const transactions = await transactionCollection();
    const siteFilter = site === "all" ? {} : site === "central" ? { fromSiteId: null, toSiteId: null } : { $or: [{ fromSiteId: new ObjectId(site) }, { toSiteId: new ObjectId(site) }] };
    const rows = await transactions.find(siteFilter).sort({ at: -1 }).limit(LIMIT).toArray();
    const db = await getDb();
    const deviceIds = [...new Set(rows.map((row) => row.deviceId.toHexString()))].map((id) => new ObjectId(id));
    const holderIds = [...new Set(rows.flatMap((row) => [row.fromHolderId?.toHexString(), row.toHolderId?.toHexString()]).filter((id): id is string => Boolean(id)))].map((id) => new ObjectId(id));
    const siteIds = [...new Set(rows.flatMap((row) => [row.fromSiteId?.toHexString(), row.toSiteId?.toHexString()]).filter((id): id is string => Boolean(id)))].map((id) => new ObjectId(id));
    const [devices, holders, sites] = await Promise.all([
      db.collection("devices").find({ _id: { $in: deviceIds } }).toArray(),
      db.collection("holders").find({ _id: { $in: holderIds } }).toArray(),
      db.collection("sites").find({ _id: { $in: siteIds } }).toArray(),
    ]);
    const deviceLabel = new Map(devices.map((device) => [String(device._id), String(device.deviceId ?? device.imei ?? device._id)]));
    const holderName = new Map(holders.map((holder) => [String(holder._id), String(holder.name)]));
    const siteName = new Map(sites.map((item) => [String(item._id), String(item.name)]));
    return Response.json({
      transactions: rows.map((row) => ({
        ...custodyTransactionItem(row),
        deviceLabel: deviceLabel.get(row.deviceId.toHexString()) ?? "—",
        fromHolderName: row.fromHolderId ? holderName.get(row.fromHolderId.toHexString()) ?? "—" : null,
        toHolderName: row.toHolderId ? holderName.get(row.toHolderId.toHexString()) ?? "—" : null,
        fromSiteName: row.fromSiteId ? siteName.get(row.fromSiteId.toHexString()) ?? "—" : null,
        toSiteName: row.toSiteId ? siteName.get(row.toSiteId.toHexString()) ?? "—" : null,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return inventoryFailure(error); }
}
