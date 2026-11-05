import { inventoryAccess, inventoryFailure, InventoryError } from "@/lib/inventory-access";
import { readInventoryFile } from "@/lib/inventory-file";
import { existingImportIds } from "@/lib/db/inventory";
import { MAX_FILE_BYTES } from "@/lib/inventory";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await inventoryAccess(request, true);
    if (Number(request.headers.get("content-length")) > MAX_FILE_BYTES + 65536) throw new InventoryError("File exceeds 5 MB", 413);
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File)) throw new InventoryError("Choose a CSV or XLSX file");
    let preview;
    try { preview = await readInventoryFile(file, String(data.get("identifier") || ""), String(data.get("sheet") || "")); }
    catch (error) { throw new InventoryError(error instanceof Error ? error.message : "Cannot read this file"); }
    const ids = await existingImportIds(preview.rows);
    preview.rows = preview.rows.map((row) => ({ ...row, existing: ids.has(row.deviceId.toLowerCase()) || Boolean(row.deviceName && ids.has(row.deviceName.toLowerCase())) }));
    preview.databaseChecked = true;
    return Response.json(preview);
  } catch (error) { return inventoryFailure(error); }
}
