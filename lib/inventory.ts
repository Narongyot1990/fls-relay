export const MAX_IMPORT_ROWS = 2000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export type InventoryRole = "it" | "implementation" | "site_leader" | "system_admin";

export interface InventoryItem {
  id: string;
  deviceId: string;
  deviceName: string;
  model: string;
  imei: string;
  serial: string;
  phoneNumber: string;
  status: string;
  siteId: string | null;
  holderId: string | null;
  importSource?: string;
  mdm: Record<string, string | null>;
}

export interface ImportRow {
  row: number;
  deviceId: string;
  deviceName: string;
  managedBy: string;
  ownership: string;
  compliance: string;
  os: string;
  osVersion: string;
  primaryUserUpn: string;
  lastCheckIn: string;
}
export interface ImportPreviewRow extends ImportRow { errors: string[]; existing: boolean }
export interface ImportPreview {
  filename: string; sheet: string; sheets: string[]; headers: string[];
  identifier: string; rows: ImportPreviewRow[]; databaseChecked: boolean;
}

export function validateImportRows(input: unknown): ImportPreviewRow[] {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_IMPORT_ROWS) throw new Error(`The file must contain 1–${MAX_IMPORT_ROWS} rows`);
  const counts = new Map<string, number>();
  for (const raw of input) {
    const key = raw && typeof raw.deviceId === "string" ? raw.deviceId.trim().toLowerCase() : "";
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return input.map((raw, index) => {
    const errors: string[] = [];
    const row: ImportRow = { row: index + 2, deviceId: "", deviceName: "", managedBy: "", ownership: "", compliance: "", os: "", osVersion: "", primaryUserUpn: "", lastCheckIn: "" };
    for (const key of Object.keys(row) as (keyof ImportRow)[]) {
      if (key === "row") continue;
      const value = raw && typeof raw === "object" && typeof raw[key] === "string" ? raw[key].trim() : "";
      if (value.length > 512) errors.push(`${key} exceeds 512 characters`);
      row[key] = value;
    }
    if (!row.deviceId) errors.push("Device ID is required");
    const normalizedId = row.deviceId.toLowerCase();
    if ((counts.get(normalizedId) ?? 0) > 1) errors.push("Duplicate Device ID in this file; review every row with this ID");
    if (row.lastCheckIn && Number.isNaN(Date.parse(row.lastCheckIn))) errors.push("Invalid last check-in date; use ISO date/time");
    if (row.lastCheckIn && !Number.isNaN(Date.parse(row.lastCheckIn))) row.lastCheckIn = new Date(row.lastCheckIn).toISOString();
    return { ...row, errors, existing: false };
  });
}
