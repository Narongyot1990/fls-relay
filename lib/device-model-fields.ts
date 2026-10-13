export type DeviceFieldInputType = "text" | "select" | "date";

export interface DeviceFieldOption {
  key: string;
  label: string;
  inputType: DeviceFieldInputType;
  options?: string[];
  placeholder?: string;
}

/**
 * Fixed catalog of optional per-device fields an IT admin can turn on for a
 * model template. Kept as a fixed list (not free-form custom fields) so every
 * model's extra data stays consistent and reportable across the fleet.
 */
export const DEVICE_FIELD_CATALOG: DeviceFieldOption[] = [
  { key: "color", label: "Color", inputType: "text", placeholder: "e.g. Midnight Black" },
  {
    key: "storageCapacity",
    label: "Storage capacity",
    inputType: "select",
    options: ["32GB", "64GB", "128GB", "256GB", "512GB"],
  },
  {
    key: "simType",
    label: "SIM type",
    inputType: "select",
    options: ["Single SIM", "Dual SIM", "eSIM"],
  },
  { key: "assetTag", label: "Asset tag / barcode", inputType: "text", placeholder: "Company asset sticker number" },
  { key: "supplier", label: "Supplier", inputType: "text", placeholder: "e.g. the vendor's name" },
  { key: "macAddress", label: "Wi-Fi MAC address", inputType: "text", placeholder: "AA:BB:CC:DD:EE:FF" },
  { key: "purchaseDate", label: "Purchase date", inputType: "date" },
  { key: "warrantyExpiry", label: "Warranty expiry", inputType: "date" },
];

export function fieldByKey(key: string): DeviceFieldOption | undefined {
  return DEVICE_FIELD_CATALOG.find((f) => f.key === key);
}
