export type DeviceFieldInputType = "text" | "select" | "date";

export type DeviceFieldCategory = "Procurement & identification" | "Hardware & connectivity" | "SIM & network";

export interface DeviceFieldOption {
  key: string;
  label: string;
  category: DeviceFieldCategory;
  inputType: DeviceFieldInputType;
  options?: string[];
  placeholder?: string;
}

/**
 * Fixed catalog of optional per-device fields an IT admin can turn on for a
 * model template. Kept as a fixed list (not free-form custom fields) so every
 * model's extra data stays consistent and reportable across the fleet.
 *
 * Curated from a fleet-ops research doc (FLEET_PHONE_AND_SIM_GUIDE.md) — only
 * the fields worth the data-entry cost made it in. Deliberately left out: a
 * separate SIM entity/collection (real SIM lifecycle tracking is a bigger,
 * separately-scoped feature), EID/eSIM and Bluetooth MAC (narrow cases, not
 * the common fleet setup), MFD date and Android OS version (the latter
 * already lives on `Device.mdm`, tracking it twice invites drift), and PO
 * number (assetTag + supplier + warrantyExpiry already cover procurement
 * traceability without it).
 */
export const DEVICE_FIELD_CATALOG: DeviceFieldOption[] = [
  // Procurement & identification
  {
    key: "fullModelCode",
    label: "Full model code (SKU)",
    category: "Procurement & identification",
    inputType: "text",
    placeholder: "e.g. SM-A165FZKDTHL",
  },
  { key: "color", label: "Color", category: "Procurement & identification", inputType: "text", placeholder: "e.g. Midnight Black" },
  {
    key: "assetTag",
    label: "Asset tag / barcode",
    category: "Procurement & identification",
    inputType: "text",
    placeholder: "Company asset sticker number",
  },
  { key: "supplier", label: "Supplier", category: "Procurement & identification", inputType: "text", placeholder: "e.g. the vendor's name" },
  {
    key: "distributor",
    label: "Distributor / warranty center",
    category: "Procurement & identification",
    inputType: "select",
    options: ["Synnex", "SiS", "VST ECS", "Jaymart", "AIS Business", "True Business", "Other"],
  },
  { key: "purchaseDate", label: "Purchase date", category: "Procurement & identification", inputType: "date" },
  { key: "warrantyExpiry", label: "Warranty expiry", category: "Procurement & identification", inputType: "date" },

  // Hardware & connectivity
  {
    key: "ramCapacity",
    label: "RAM",
    category: "Hardware & connectivity",
    inputType: "select",
    options: ["3GB", "4GB", "6GB", "8GB", "12GB"],
  },
  {
    key: "storageCapacity",
    label: "Storage capacity",
    category: "Hardware & connectivity",
    inputType: "select",
    options: ["32GB", "64GB", "128GB", "256GB", "512GB"],
  },
  { key: "macAddress", label: "Wi-Fi MAC address", category: "Hardware & connectivity", inputType: "text", placeholder: "AA:BB:CC:DD:EE:FF" },
  { key: "imei2", label: "IMEI 2 (dual-SIM slot 2)", category: "Hardware & connectivity", inputType: "text", placeholder: "15 digits" },

  // SIM & network
  {
    key: "simType",
    label: "SIM type",
    category: "SIM & network",
    inputType: "select",
    options: ["Single SIM", "Dual SIM", "eSIM"],
  },
  { key: "simIccid", label: "SIM ICCID", category: "SIM & network", inputType: "text", placeholder: "19-20 digits, printed on the SIM" },
  {
    key: "simCarrier",
    label: "SIM carrier",
    category: "SIM & network",
    inputType: "select",
    options: ["AIS", "TRUE", "DTAC", "NT", "Other"],
  },
  { key: "simPukCode", label: "SIM PUK code", category: "SIM & network", inputType: "text", placeholder: "8 digits — unlocks a PIN-locked SIM" },
  { key: "simDataPlan", label: "SIM data plan", category: "SIM & network", inputType: "text", placeholder: "e.g. Unlimited 10Mbps" },
];

export function fieldByKey(key: string): DeviceFieldOption | undefined {
  return DEVICE_FIELD_CATALOG.find((f) => f.key === key);
}

/** Short, plain-language description of what ticking this field's checkbox actually adds to the form. */
export function describeField(field: DeviceFieldOption): string {
  if (field.inputType === "select") return `Dropdown — ${field.options?.join(", ")}`;
  if (field.inputType === "date") return "Date picker";
  return field.placeholder ? `Free text — ${field.placeholder}` : "Free text";
}
