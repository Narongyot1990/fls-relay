import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { SiteDoc } from "@/lib/db/documents";
import { DirectoryValidationError, validateSiteInput } from "@/lib/directory";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";

export async function POST(request: Request) {
  try {
    await inventoryAccess(request, "directory");
    const input = validateSiteInput(await request.json());
    const collection = (await getDb()).collection<SiteDoc>("sites");
    if (await collection.findOne({ code: input.code }, { collation: { locale: "en", strength: 2 } })) throw new InventoryError("Site code already exists", 409);
    await collection.createIndex({ code: 1 }, { unique: true });
    const doc: SiteDoc = { _id: new ObjectId(), ...input, active: true };
    await collection.insertOne(doc);
    return Response.json({ site: { id: String(doc._id), ...input, active: true } }, { status: 201 });
  } catch (error) {
    if (error instanceof DirectoryValidationError || error instanceof SyntaxError) return Response.json({ error: error.message }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return Response.json({ error: "Site code already exists" }, { status: 409 });
    return inventoryFailure(error);
  }
}
