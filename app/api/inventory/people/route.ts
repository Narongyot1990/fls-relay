import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db/mongodb";
import type { HolderDoc } from "@/lib/db/documents";
import { DirectoryValidationError, validatePersonInput } from "@/lib/directory";
import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";

export async function POST(request: Request) {
  try {
    await inventoryAccess(request, "directory");
    const input = validatePersonInput(await request.json());
    const db = await getDb();
    if (!await db.collection("sites").findOne({ _id: new ObjectId(input.siteId), active: true })) throw new InventoryError("Select an existing active site");
    const collection = db.collection<HolderDoc>("holders");
    if (await collection.findOne({ employeeNo: input.employeeNo }, { collation: { locale: "en", strength: 2 } })) throw new InventoryError("FLS Employee ID already exists", 409);
    await collection.createIndex({ employeeNo: 1 }, { unique: true });
    const doc: HolderDoc = { _id: new ObjectId(), ...input, siteId: new ObjectId(input.siteId), active: true };
    await collection.insertOne(doc);
    return Response.json({ person: { id: String(doc._id), ...input, active: true } }, { status: 201 });
  } catch (error) {
    if (error instanceof DirectoryValidationError || error instanceof SyntaxError) return Response.json({ error: error.message }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === 11000) return Response.json({ error: "FLS Employee ID already exists" }, { status: 409 });
    return inventoryFailure(error);
  }
}
