export type DeviceStatus =
  | "registered"
  | "in_site_stock"
  | "assigned"
  | "returned"
  | "retired"
  | "lost";

export type TransactionType = "T1" | "T2" | "T3" | "T4" | "T5";

export type ConfirmState = "pending" | "confirmed" | "rejected";

export type ConditionGradeKey = "A" | "B" | "C" | "D";

export type ReasonCode =
  | "resignation"
  | "site_transfer"
  | "damage"
  | "malfunction"
  | "loss"
  | "upgrade"
  | "end_of_life";

export type AccessoryKey = "charger" | "cable" | "case" | "mount" | "sim";

export interface Site {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface ModelImage {
  url: string;
  /** Free text — what the photo shows (e.g. "Device front", "Charger", "SIM tray"). */
  description: string;
}

export interface DeviceModel {
  id: string;
  name: string;
  active: boolean;
  /** Keys into DEVICE_FIELD_CATALOG (lib/device-model-fields.ts) this model collects at registration. */
  fieldKeys: string[];
  images: ModelImage[];
}

export interface Holder {
  id: string;
  type: "driver" | "site_leader";
  name: string;
  employeeNo: string;
  siteId: string;
  phone: string;
  active: boolean;
  separatedAt?: string;
}

export type MdmOwnershipType = "corporate" | "personal";
export type MdmManagementMode = "dedicated" | "fully_managed";
export type MdmComplianceState = "compliant" | "noncompliant" | "unknown";

/**
 * Snapshot of this device's MDM enrollment, entered by IT from whatever the MDM
 * console shows (Intune today, possibly another tool later — kept free-form on
 * purpose so this isn't tied to one vendor's naming). Written only through the
 * device's MDM-info edit action, never by a handover transaction: it is reference
 * data for IT, not a custody signal. `primaryUserUpn` is the MDM enrollment
 * identity, not the physical holder — never sync it into `currentHolderId`.
 */
export interface DeviceMdmInfo {
  deviceName: string;
  managedBy: string;
  ownershipType: MdmOwnershipType;
  managementMode: MdmManagementMode;
  complianceState: MdmComplianceState;
  osPlatform: string;
  osVersion: string;
  primaryUserUpn: string | null;
  lastCheckInAt: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface Device {
  id: string;
  imei: string;
  serial: string;
  model: string;
  phoneNumber: string;
  status: DeviceStatus;
  currentHolderId: string | null;
  /** Null until a T1 "Issue to Site" transaction is confirmed — registration no longer assigns a site. */
  currentSiteId: string | null;
  mdm?: DeviceMdmInfo;
  /** Values for this model's optional template fields, keyed by DEVICE_FIELD_CATALOG key. */
  customFields?: Record<string, string>;
}

export interface TransactionEvidence {
  type: string;
  url: string;
  uploadedAt: string;
}

export interface TimelineEntry {
  id: string;
  txNumber: string;
  type: TransactionType;
  date: string;
  title: string;
  detail?: string;
  confirmState: ConfirmState;
  isCorrection?: boolean;
  correctsTxNumber?: string;
}

export interface PendingItem {
  id: string;
  txNumber: string;
  type: TransactionType;
  deviceModel: string;
  imeiLast4: string;
  fromLabel: string;
  createdAt: string;
  accessories?: AccessoryKey[];
  conditionGrade?: ConditionGradeKey;
  photoUrl?: string | null;
}

export type Level = "L1" | "L2" | "L3" | "L4";

export interface CurrentUser {
  id: string;
  name: string;
  level: Level;
  /**
   * The one site this user's home/handover screens default to acting on. Null for
   * roles that aren't bound to a single site (IT, Ops Supervisor, Management) —
   * UI convenience only. `scopedSiteIds` is the actual authorization/visibility
   * signal; don't derive access decisions from `siteId === null`.
   */
  siteId: string | null;
  /** Sites this user can act on. Empty means every site (L4, and L1/L3 who aren't site-bound). */
  scopedSiteIds: string[];
}
