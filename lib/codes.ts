import type { AccessoryKey, ConditionGradeKey, DeviceStatus, ReasonCode } from "@/types";

export const ACCESSORY_LABELS: Record<AccessoryKey, string> = {
  charger: "ที่ชาร์จ",
  cable: "สายชาร์จ",
  case: "เคส",
  mount: "ขาตั้ง",
  sim: "ซิมการ์ด",
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
  { key: "A", label: "สภาพดี ใช้งานได้" },
  { key: "B", label: "เสียหายเล็กน้อย" },
  { key: "C", label: "เสียหายมาก" },
  { key: "D", label: "ใช้งานไม่ได้" },
];

export const REASON_LABELS: Record<ReasonCode, string> = {
  resignation: "ลาออก",
  site_transfer: "โอนย้ายไซต์",
  damage: "เครื่องเสียหาย",
  malfunction: "เครื่องขัดข้อง",
  loss: "เครื่องสูญหาย",
  upgrade: "เปลี่ยนรุ่น",
  end_of_life: "หมดอายุการใช้งาน",
};

export const STATUS_LABELS: Record<DeviceStatus, { label: string; dotClass: string }> = {
  registered: { label: "ลงทะเบียนแล้ว", dotClass: "bg-slate-400" },
  in_site_stock: { label: "อยู่ในสต็อก", dotClass: "bg-blue-500" },
  assigned: { label: "มอบให้แล้ว", dotClass: "bg-emerald-500" },
  returned: { label: "รับคืนแล้ว", dotClass: "bg-amber-500" },
  retired: { label: "เลิกใช้งาน", dotClass: "bg-neutral-400" },
  lost: { label: "สูญหาย", dotClass: "bg-red-500" },
};

export function last4(imei: string): string {
  return imei.slice(-4);
}

export function maskedImei(imei: string): string {
  const maskLength = Math.max(0, imei.length - 6);
  return `${imei.slice(0, 2)}${"*".repeat(maskLength)}${imei.slice(-4)}`;
}
