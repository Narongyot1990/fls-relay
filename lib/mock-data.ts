import type {
  CurrentUser,
  Device,
  Holder,
  PendingItem,
  Site,
  TimelineEntry,
} from "@/types";

export const CURRENT_SITE_ID = "site-rayong";

export const CURRENT_USER: CurrentUser = {
  id: "user-1",
  name: "นายสมศักดิ์ แก้วมณี",
  level: "L2",
  siteId: CURRENT_SITE_ID,
};

export const SITES: Site[] = [
  { id: "site-rayong", code: "RYG", name: "Rayong site", active: true },
  { id: "site-chonburi", code: "CBI", name: "Chonburi site", active: true },
  { id: "site-laemchabang", code: "LCB", name: "Laem Chabang site", active: true },
];

export const HOLDERS: Holder[] = [
  { id: "h-1", type: "driver", name: "สมชาย ใจดี", employeeNo: "DRV-0142", siteId: CURRENT_SITE_ID, phone: "081-000-0142", active: true },
  { id: "h-2", type: "driver", name: "วิชัย สุขสม", employeeNo: "DRV-0188", siteId: CURRENT_SITE_ID, phone: "081-000-0188", active: true },
  { id: "h-3", type: "driver", name: "ประสิทธิ์ รุ่งเรือง", employeeNo: "DRV-0203", siteId: CURRENT_SITE_ID, phone: "081-000-0203", active: true },
  { id: "h-4", type: "driver", name: "อนันต์ ศรีสุข", employeeNo: "DRV-0219", siteId: CURRENT_SITE_ID, phone: "081-000-0219", active: true },
  { id: "h-5", type: "site_leader", name: "สมศักดิ์ แก้วมณี", employeeNo: "SL-0010", siteId: CURRENT_SITE_ID, phone: "081-111-0010", active: true },
  { id: "h-6", type: "site_leader", name: "ดวงใจ ทองดี", employeeNo: "SL-0022", siteId: "site-chonburi", phone: "081-111-0022", active: true },
];

export const DEVICES: Device[] = [
  { id: "d-1", imei: "356938035241821", serial: "SNA15-0821", model: "Samsung A15", phoneNumber: "089-120-0821", status: "in_site_stock", currentHolderId: null, currentSiteId: CURRENT_SITE_ID },
  { id: "d-2", imei: "356938035241822", serial: "SNA15-0822", model: "Samsung A15", phoneNumber: "089-120-0822", status: "in_site_stock", currentHolderId: null, currentSiteId: CURRENT_SITE_ID },
  { id: "d-3", imei: "356938035241823", serial: "SNA15-0823", model: "Samsung A15", phoneNumber: "089-120-0823", status: "assigned", currentHolderId: "h-1", currentSiteId: CURRENT_SITE_ID },
  { id: "d-4", imei: "356938035241830", serial: "SNA15-0830", model: "Samsung A15", phoneNumber: "089-120-0830", status: "assigned", currentHolderId: "h-2", currentSiteId: CURRENT_SITE_ID },
  { id: "d-5", imei: "356938035241841", serial: "SNA15-0841", model: "Samsung A15", phoneNumber: "089-120-0841", status: "returned", currentHolderId: null, currentSiteId: CURRENT_SITE_ID },
];

export const PENDING_FOR_ME: PendingItem[] = [
  {
    id: "p-1",
    txNumber: "TX-2026-00412",
    type: "T2",
    deviceModel: "Samsung A15",
    imeiLast4: "4821",
    fromLabel: "Site leader Rayong",
    createdAt: "วันนี้ 07:14",
    accessories: ["charger", "cable", "case", "sim"],
    conditionGrade: "A",
    photoUrl: null,
  },
  {
    id: "p-2",
    txNumber: "TX-2026-00413",
    type: "T4",
    deviceModel: "Samsung A15",
    imeiLast4: "4830",
    fromLabel: "วิชัย สุขสม",
    createdAt: "วันนี้ 06:40",
    accessories: ["charger", "cable"],
    conditionGrade: "B",
    photoUrl: null,
  },
];

export const DEVICE_TIMELINE: Record<string, TimelineEntry[]> = {
  "356938035241823": [
    { id: "t-4", txNumber: "TX-2026-00412", type: "T2", date: "12 Oct", title: "มอบให้ สมชาย ใจดี", confirmState: "confirmed" },
    { id: "t-3", txNumber: "TX-2026-00388", type: "T4", date: "08 Oct", title: "รับคืนจาก วิชัย สุขสม", detail: "สภาพ B", confirmState: "confirmed" },
    { id: "t-2", txNumber: "TX-2026-00210", type: "T1", date: "02 Sep", title: "ส่งเข้าไซต์ Rayong", confirmState: "confirmed" },
    { id: "t-1", txNumber: "TX-2026-00001", type: "T1", date: "28 Aug", title: "ลงทะเบียนเครื่อง", confirmState: "confirmed" },
  ],
};

export function getHolderById(id: string | null): Holder | undefined {
  if (!id) return undefined;
  return HOLDERS.find((h) => h.id === id);
}

export function getSiteById(id: string): Site | undefined {
  return SITES.find((s) => s.id === id);
}

export function getDeviceByImei(imei: string): Device | undefined {
  return DEVICES.find((d) => d.imei === imei);
}

export function stockAtSite(siteId: string): Device[] {
  return DEVICES.filter((d) => d.currentSiteId === siteId && d.status === "in_site_stock");
}

export function assignedAtSite(siteId: string): Device[] {
  return DEVICES.filter((d) => d.currentSiteId === siteId && d.status === "assigned");
}

export function holdersAtSite(siteId: string): Holder[] {
  return HOLDERS.filter((h) => h.siteId === siteId && h.active && h.type === "driver");
}
