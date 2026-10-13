import type { Device, DeviceModel, Holder, Site } from "@/types";
import type { DeviceDoc, HolderDoc, ModelDoc, SiteDoc } from "./documents";

export function siteFromDoc(doc: SiteDoc): Site {
  return {
    id: doc._id.toHexString(),
    code: doc.code,
    name: doc.name,
    active: doc.active,
  };
}

export function modelFromDoc(doc: ModelDoc): DeviceModel {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    active: doc.active,
    fieldKeys: doc.fieldKeys,
    images: doc.images ?? [],
  };
}

export function holderFromDoc(doc: HolderDoc): Holder {
  return {
    id: doc._id.toHexString(),
    type: doc.type,
    name: doc.name,
    employeeNo: doc.employeeNo,
    siteId: doc.siteId.toHexString(),
    phone: doc.phone,
    active: doc.active,
    separatedAt: doc.separatedAt ? doc.separatedAt.toISOString() : undefined,
  };
}

export function deviceFromDoc(doc: DeviceDoc): Device {
  return {
    id: doc._id.toHexString(),
    imei: doc.imei,
    serial: doc.serial,
    model: doc.model,
    phoneNumber: doc.phoneNumber,
    status: doc.status,
    currentHolderId: doc.currentHolderId ? doc.currentHolderId.toHexString() : null,
    currentSiteId: doc.currentSiteId.toHexString(),
    mdm: doc.mdm,
    customFields: doc.customFields,
  };
}
