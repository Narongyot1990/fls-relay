import type { InventoryRole } from "./inventory";

export interface DirectorySite { id: string; code: string; name: string; active: boolean }
export interface DirectoryPerson { id: string; name: string; type: string; employeeNo: string; siteId: string; active: boolean; phone?: string }
export function canManageDirectory(role: InventoryRole) { return role === "it" || role === "system_admin"; }
export class DirectoryValidationError extends Error {}

function text(body: Record<string, unknown>, key: string, max: number, required = true) {
  if (typeof body[key] !== "string" || body[key].trim().length > max || (required && !body[key].trim())) throw new DirectoryValidationError(`Invalid ${key}`);
  return body[key].trim();
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DirectoryValidationError("Invalid form data");
  return value as Record<string, unknown>;
}
export function validateSiteInput(value: unknown) {
  const body = object(value), code = text(body, "code", 24).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{1,23}$/.test(code)) throw new DirectoryValidationError("Site code must be 2–24 letters, numbers, hyphens or underscores");
  return { code, name: text(body, "name", 120) };
}
export function validatePersonInput(value: unknown): { type: "driver" | "site_leader"; name: string; employeeNo: string; siteId: string; phone: string } {
  const body = object(value);
  if (body.type !== "driver" && body.type !== "site_leader") throw new DirectoryValidationError("Select Driver or Site Leader");
  const siteId = text(body, "siteId", 24);
  if (!/^[a-f0-9]{24}$/i.test(siteId)) throw new DirectoryValidationError("Select an existing active site");
  return { type: body.type, name: text(body, "name", 120), employeeNo: text(body, "employeeNo", 64).toUpperCase(), siteId,
    phone: text({ ...body, phone: body.phone ?? "" }, "phone", 40, false) };
}
