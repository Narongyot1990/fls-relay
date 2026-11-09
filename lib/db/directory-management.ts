import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import { validatePersonInput, validateSiteInput, DirectoryValidationError } from "@/lib/directory";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";

type Kind = "sites" | "people";

/** These endpoints use the current inventory roles, independently of the legacy admin APIs. */
export async function manageDirectory(request: Request, id: string, kind: Kind) {
  try {
    await inventoryAccess(request, "directory");
    if (!ObjectId.isValid(id)) throw new InventoryError("Invalid record ID");
    const db = await getDb();
    const _id = new ObjectId(id);
    const collection = db.collection(kind === "sites" ? "sites" : "holders");
    const old = await collection.findOne({ _id });
    if (!old) throw new InventoryError("Record not found", 404);
    const devices = db.collection("devices"), holders = db.collection("holders");
    const historyFilter = kind === "sites" ? { $or: [{ fromSiteId: _id }, { toSiteId: _id }] } : { $or: [{ fromHolderId: _id }, { toHolderId: _id }, { actor: id }, { signerId: _id }] };
    if (request.method === "DELETE") {
      const [phoneReferences, peopleReferences, historyReferences] = await Promise.all([
        devices.countDocuments(kind === "sites" ? { currentSiteId: _id } : { currentHolderId: _id }),
        kind === "sites" ? holders.countDocuments({ siteId: _id }) : Promise.resolve(0),
        db.collection("custody_transactions").countDocuments(historyFilter),
      ]);
      if (phoneReferences || peopleReferences || historyReferences) throw new InventoryError(`Cannot delete: ${phoneReferences} device(s), ${peopleReferences} person(s), ${historyReferences} history entry/entries reference this record. Deactivate it instead to preserve tracking.`, 409);
      const result = await collection.deleteOne({ _id });
      if (!result.deletedCount) throw new InventoryError("Record changed; reload before retrying", 409);
      return Response.json({ deleted: true });
    }
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new InventoryError("Invalid form data");
    if (body.active !== undefined && typeof body.active !== "boolean") throw new InventoryError("Active must be true or false");
    const active = body.active ?? old.active === true;
    const base = { ...old, ...(old.siteId ? { siteId: String(old.siteId) } : {}), ...body };
    const input = kind === "sites" ? validateSiteInput(base) : validatePersonInput(base);
    const uniqueKey = kind === "sites" ? "code" : "employeeNo";
    const uniqueValue = "code" in input ? input.code : input.employeeNo;
    if (await collection.findOne({ _id: { $ne: _id }, [uniqueKey]: uniqueValue }, { collation: { locale: "en", strength: 2 } })) throw new InventoryError(kind === "sites" ? "Site code already exists" : "FLS Employee ID already exists", 409);
    if (kind === "sites") {
      if (!active && old.active) {
        const [phones, people] = await Promise.all([devices.countDocuments({ currentSiteId: _id, active: true }), holders.countDocuments({ siteId: _id, active: true })]);
        if (phones || people) throw new InventoryError("Move active devices and deactivate or reassign people before deactivating this site", 409);
      }
    } else if ("siteId" in input) {
      const relocating = String(old.siteId) !== input.siteId || old.type !== input.type;
      if (!await db.collection("sites").findOne({ _id: new ObjectId(input.siteId), ...((active || relocating) ? { active: true } : {}) })) throw new InventoryError("Select an existing active site");
      if (relocating || (!active && old.active)) {
        if (await devices.countDocuments({ currentHolderId: _id })) throw new InventoryError("Return this person's assigned phones before changing their site, type or active status", 409);
        if (old.type === "site_leader") {
          const [stock, otherLeaders] = await Promise.all([
            devices.countDocuments({ currentSiteId: old.siteId, active: true, status: { $in: ["in_site_stock", "in_transit"] } }),
            holders.countDocuments({ _id: { $ne: _id }, siteId: old.siteId, type: "site_leader", active: true }),
          ]);
          if (stock && !otherLeaders) throw new InventoryError("Assign another active Site Leader before removing the last leader from a site with stock", 409);
        }
      }
    }
    await collection.createIndex({ [uniqueKey]: 1 }, { unique: true });
    const fields = { ...input, active, ...("siteId" in input ? { siteId: new ObjectId(input.siteId) } : {}) };
    const updated = await collection.findOneAndUpdate({ _id }, { $set: fields }, { returnDocument: "after" });
    if (!updated) throw new InventoryError("Record changed; reload before retrying", 409);
    return Response.json(kind === "sites" ? { site: { id, ...input, active } } : { person: { id, ...input, active } });
  } catch (error) {
    if (error instanceof DirectoryValidationError || error instanceof SyntaxError) return Response.json({ error: error.message }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return Response.json({ error: kind === "sites" ? "Site code already exists" : "FLS Employee ID already exists" }, { status: 409 });
    return inventoryFailure(error);
  }
}
