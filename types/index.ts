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

export interface Device {
  id: string;
  imei: string;
  serial: string;
  model: string;
  phoneNumber: string;
  status: DeviceStatus;
  currentHolderId: string | null;
  currentSiteId: string;
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

export interface CurrentUser {
  id: string;
  name: string;
  level: "L1" | "L2" | "L3" | "L4";
  siteId: string;
}
