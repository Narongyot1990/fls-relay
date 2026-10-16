import type { ObjectId } from "mongodb";
import type { DeviceMdmInfo, DeviceStatus, ModelImage } from "@/types";

export interface SiteDoc {
  _id: ObjectId;
  code: string;
  name: string;
  active: boolean;
}

export interface ModelDoc {
  _id: ObjectId;
  name: string;
  active: boolean;
  fieldKeys: string[];
  images?: ModelImage[];
}

export interface HolderDoc {
  _id: ObjectId;
  type: "driver" | "site_leader";
  name: string;
  employeeNo: string;
  siteId: ObjectId;
  phone: string;
  active: boolean;
  separatedAt?: Date | null;
}

export interface DeviceDoc {
  _id: ObjectId;
  imei: string;
  serial: string;
  model: string;
  phoneNumber: string;
  status: DeviceStatus;
  currentHolderId: ObjectId | null;
  currentSiteId: ObjectId | null;
  registeredAt: Date;
  active: boolean;
  mdm?: DeviceMdmInfo;
  customFields?: Record<string, string>;
}

export interface TransactionDoc {
  _id: ObjectId;
  txNumber: string;
  type: "T1";
  deviceId: ObjectId;
  imei: string;
  deviceModel: string;
  toSiteId: ObjectId;
  confirmState: "pending" | "confirmed" | "rejected";
  createdById: string;
  createdByName: string;
  createdAt: Date;
  confirmedById?: string | null;
  confirmedByName?: string | null;
  confirmedAt?: Date | null;
  rejectionNote?: string | null;
}
