import type { ObjectId } from "mongodb";
import type { DeviceMdmInfo, DeviceStatus } from "@/types";

export interface SiteDoc {
  _id: ObjectId;
  code: string;
  name: string;
  active: boolean;
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
  currentSiteId: ObjectId;
  registeredAt: Date;
  active: boolean;
  mdm?: DeviceMdmInfo;
}
