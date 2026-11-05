import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";
import { validateImportRows } from "@/lib/inventory";
import { inventoryCollection, existingImportIds, ensureInventoryIndexes, importDocument } from "@/lib/db/inventory";

export async function POST(request: Request) {
  try {
    const access = await inventoryAccess(request, true);
    const body = await request.json();
    if (body.confirm !== true) throw new InventoryError("Explicit import confirmation is required");
    let rows;
    try { rows = validateImportRows(body.rows); } catch (error) { throw new InventoryError(error instanceof Error ? error.message : "Invalid rows"); }
    if (rows.some((row) => row.errors.length)) throw new InventoryError("Fix invalid or duplicate rows before importing");
    const existing = await existingImportIds(rows);
    const collection = await inventoryCollection();
    await ensureInventoryIndexes(collection);
    const created: string[] = [], skipped: string[] = [], failed: { deviceId: string; error: string }[] = [];
    const filename = typeof body.filename === "string" ? body.filename.slice(0, 200) : "upload";
    for (const row of rows) {
      if (existing.has(row.deviceId.toLowerCase()) || (row.deviceName && existing.has(row.deviceName.toLowerCase()))) { skipped.push(row.deviceId); continue; }
      try {
        await collection.insertOne(importDocument(row, filename, access.actor));
        created.push(row.deviceId);
        existing.add(row.deviceId.toLowerCase());
        if (row.deviceName) existing.add(row.deviceName.toLowerCase());
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === 11000) skipped.push(row.deviceId);
        else failed.push({ deviceId: row.deviceId, error: "Could not save this row. Refresh inventory before retrying." });
      }
    }
    return Response.json({ created, skipped, failed }, { status: 201 });
  } catch (error) { return inventoryFailure(error); }
}
