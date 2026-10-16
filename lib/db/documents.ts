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
