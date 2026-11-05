import ExcelJS from "exceljs";
import { findColumn, type ParsedCsv } from "./csv";
import { parseInventoryCsv } from "./inventory-csv";
import { MAX_FILE_BYTES, MAX_IMPORT_ROWS, validateImportRows, type ImportPreview } from "./inventory";

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value).trim();
  if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
  if ("richText" in value) return value.richText.map((part) => part.text).join("").trim();
  if ("text" in value) return value.text.trim();
  return "";
}

export async function readInventoryFile(file: File, identifier?: string, sheetName?: string): Promise<ImportPreview> {
  if (file.size < 1 || file.size > MAX_FILE_BYTES) throw new Error("Choose a non-empty CSV/XLSX file no larger than 5 MB");
  let table: ParsedCsv;
  let sheets: string[] = [], sheet = "CSV";
  if (/\.csv$/i.test(file.name)) table = parseInventoryCsv(await file.text());
  else if (/\.xlsx$/i.test(file.name)) {
    const book = new ExcelJS.Workbook();
    const bytes = Buffer.from(await file.arrayBuffer());
    await book.xlsx.load(bytes as unknown as Parameters<typeof book.xlsx.load>[0]);
    sheets = book.worksheets.map((item) => item.name);
    const worksheet = sheetName ? book.getWorksheet(sheetName) : book.worksheets[0];
    if (!worksheet) throw new Error("Worksheet not found");
    if (worksheet.rowCount > MAX_IMPORT_ROWS + 1 || worksheet.columnCount > 64) throw new Error("Worksheet exceeds 2000 rows or 64 columns");
    sheet = worksheet.name;
    const headers = Array.from({ length: worksheet.columnCount }, (_, index) => cellText(worksheet.getRow(1).getCell(index + 1).value));
    if (headers.some((header) => !header) || new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) throw new Error("Worksheet has blank or duplicate column names");
    const rows: Record<string, string>[] = [];
    for (let index = 2; index <= worksheet.rowCount; index++) {
      const row = Object.fromEntries(headers.map((header, col) => [header, cellText(worksheet.getRow(index).getCell(col + 1).value)]));
      if (Object.values(row).some(Boolean)) rows.push(row);
    }
    table = { headers, rows };
  } else throw new Error("Only .csv and .xlsx are supported");
  const selected = identifier || findColumn(table.headers, ["Device ID", "Device name"]) || "";
  if (!selected || !table.headers.includes(selected)) throw new Error("Choose a column for Device ID (Device ID or Device name)");
  const field = (row: Record<string, string>, names: string[]) => row[findColumn(table.headers, names) ?? ""] ?? "";
  const rows = validateImportRows(table.rows.map((row) => ({
    deviceId: row[selected], deviceName: field(row, ["Device name"]), managedBy: field(row, ["Managed by"]),
    ownership: field(row, ["Ownership"]), compliance: field(row, ["Compliance"]), os: field(row, ["OS"]),
    osVersion: field(row, ["OS version"]), primaryUserUpn: field(row, ["Primary user UPN"]), lastCheckIn: field(row, ["Last check-in"]),
  })));
  return { filename: file.name, sheet, sheets, headers: table.headers, identifier: selected, rows, databaseChecked: false };
}
