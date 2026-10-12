import type { AccessoryKey, ConditionGradeKey, Device, DeviceStatus, ReasonCode } from "@/types";

export const ACCESSORY_LABELS: Record<AccessoryKey, string> = {
  charger: "Charger",
  cable: "Cable",
  case: "Case",
  mount: "Mount",
  sim: "SIM card",
};

export const ACCESSORY_ORDER: AccessoryKey[] = ["charger", "cable", "case", "mount", "sim"];

export const DEFAULT_ACCESSORIES: Record<AccessoryKey, boolean> = {
  charger: true,
  cable: true,
  case: true,
  mount: false,
  sim: true,
};

export const CONDITION_GRADES: { key: ConditionGradeKey; label: string }[] = [
  { key: "A", label: "Serviceable" },
  { key: "B", label: "Minor damage" },
  { key: "C", label: "Major damage" },
  { key: "D", label: "Unserviceable" },
];

export const REASON_LABELS: Record<ReasonCode, string> = {
  resignation: "Resignation",
  site_transfer: "Site transfer",
  damage: "Damage",
  malfunction: "Malfunction",
  loss: "Loss",
  upgrade: "Upgrade",
  end_of_life: "End of life",
};

export const STATUS_LABELS: Record<DeviceStatus, { label: string; dotClass: string }> = {
  registered: { label: "Registered", dotClass: "bg-slate-400" },
  in_site_stock: { label: "In stock", dotClass: "bg-blue-500" },
  assigned: { label: "Assigned", dotClass: "bg-emerald-500" },
  returned: { label: "Returned", dotClass: "bg-amber-500" },
  retired: { label: "Retired", dotClass: "bg-neutral-400" },
  lost: { label: "Lost", dotClass: "bg-red-500" },
};

export function last4(imei: string): string {
  return imei.slice(-4);
}

export function maskedImei(imei: string): string {
  const maskLength = Math.max(0, imei.length - 6);
  return `${imei.slice(0, 2)}${"*".repeat(maskLength)}${imei.slice(-4)}`;
}

export function deviceLabel(device: Pick<Device, "model" | "imei">): string {
  return `${device.model} ····${last4(device.imei)}`;
}

export function selectedAccessories(accessories: Record<AccessoryKey, boolean>): AccessoryKey[] {
  return ACCESSORY_ORDER.filter((key) => accessories[key]);
}
