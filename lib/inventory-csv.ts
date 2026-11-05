import type { ParsedCsv } from "./csv";

export function parseInventoryCsv(text: string): ParsedCsv {
  text = text.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let record: string[] = [], value = "", quoted = false, closed = false;
  for (let index = 0; index <= text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === undefined) throw new Error("Unclosed CSV quote");
      if (char === '"') {
        if (text[index + 1] === '"') { value += '"'; index++; }
        else { quoted = false; closed = true; }
      } else value += char;
    } else if (char === '"' && !value && !closed) quoted = true;
    else if (char === "," || char === "\n" || char === "\r" || char === undefined) {
      record.push(value.trim()); value = ""; closed = false;
      if (char !== ",") {
        if (record.some(Boolean)) records.push(record);
        record = [];
        if (char === "\r" && text[index + 1] === "\n") index++;
      }
    } else {
      if (closed && char.trim()) throw new Error("Unexpected text after a quoted CSV field");
      value += char;
    }
  }
  if (!records.length) return { headers: [], rows: [] };
  const headers = records[0];
  if (headers.some((header) => !header) || new Set(headers.map((header) => header.toLowerCase())).size !== headers.length) throw new Error("CSV has blank or duplicate column names");
  return { headers, rows: records.slice(1).map((cells) => {
    if (cells.length !== headers.length) throw new Error("CSV row has a different number of columns");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  }) };
}
