import type {
  CurrentUser,
  Device,
  Holder,
  PendingItem,
  Site,
  TimelineEntry,
} from "@/types";

export const CURRENT_SITE_ID = "site-rayong";

export const MOCK_USERS: CurrentUser[] = [
  { id: "user-l1", name: "Alex Tanner", level: "L1", siteId: CURRENT_SITE_ID, scopedSiteIds: [] },
  { id: "user-l2", name: "Somsak Kaewmanee", level: "L2", siteId: CURRENT_SITE_ID, scopedSiteIds: [CURRENT_SITE_ID] },
  { id: "user-l3", name: "Dana Reyes", level: "L3", siteId: CURRENT_SITE_ID, scopedSiteIds: ["site-rayong", "site-chonburi", "site-laemchabang"] },
  { id: "user-l4", name: "Chris Lindqvist", level: "L4", siteId: CURRENT_SITE_ID, scopedSiteIds: [] },
];

export const DEFAULT_USER_ID = "user-l2";

export const SITES: Site[] = [
  { id: "site-rayong", code: "RYG", name: "Rayong site", active: true },
  { id: "site-chonburi", code: "CBI", name: "Chonburi site", active: true },
  { id: "site-laemchabang", code: "LCB", name: "Laem Chabang site", active: true },
];

export const HOLDERS: Holder[] = [
  { id: "h-1", type: "driver", name: "Somchai Jaidee", employeeNo: "DRV-0142", siteId: CURRENT_SITE_ID, phone: "081-000-0142", active: true },
  { id: "h-2", type: "driver", name: "Wichai Suksom", employeeNo: "DRV-0188", siteId: CURRENT_SITE_ID, phone: "081-000-0188", active: true },
  { id: "h-3", type: "driver", name: "Prasit Rungrueang", employeeNo: "DRV-0203", siteId: CURRENT_SITE_ID, phone: "081-000-0203", active: true },
  { id: "h-4", type: "driver", name: "Anan Srisuk", employeeNo: "DRV-0219", siteId: CURRENT_SITE_ID, phone: "081-000-0219", active: true },
  { id: "h-5", type: "site_leader", name: "Somsak Kaewmanee", employeeNo: "SL-0010", siteId: CURRENT_SITE_ID, phone: "081-111-0010", active: true },
  { id: "h-6", type: "site_leader", name: "Duangjai Thongdee", employeeNo: "SL-0022", siteId: "site-chonburi", phone: "081-111-0022", active: true },
];

export const DEVICES: Device[] = [
  { id: "d-1", imei: "356938035241821", serial: "SNA15-0821", model: "Samsung A15", phoneNumber: "089-120-0821", status: "in_site_stock", currentHolderId: null, currentSiteId: CURRENT_SITE_ID },
  { id: "d-2", imei: "356938035241822", serial: "SNA15-0822", model: "Samsung A15", phoneNumber: "089-120-0822", status: "in_site_stock", currentHolderId: null, currentSiteId: CURRENT_SITE_ID },
  { id: "d-3", imei: "356938035241823", serial: "SNA15-0823", model: "Samsung A15", phoneNumber: "089-120-0823", status: "assigned", currentHolderId: "h-1", currentSiteId: CURRENT_SITE_ID },
  { id: "d-4", imei: "356938035241830", serial: "SNA15-0830", model: "Samsung A15", phoneNumber: "089-120-0830", status: "assigned", currentHolderId: "h-2", currentSiteId: CURRENT_SITE_ID },
  { id: "d-5", imei: "356938035241841", serial: "SNA15-0841", model: "Samsung A15", phoneNumber: "089-120-0841", status: "returned", currentHolderId: null, currentSiteId: CURRENT_SITE_ID },
  { id: "d-6", imei: "356938035241852", serial: "SNA15-0852", model: "Samsung A15", phoneNumber: "089-120-0852", status: "assigned", currentHolderId: "h-6", currentSiteId: "site-chonburi" },
];

export const PENDING_FOR_ME: PendingItem[] = [
  {
    id: "p-1",
    txNumber: "TX-2026-00412",
    type: "T2",
    deviceModel: "Samsung A15",
    imeiLast4: "4821",
    fromLabel: "Site leader Rayong",
    createdAt: "Today 07:14",
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
    fromLabel: "Wichai Suksom",
    createdAt: "Today 06:40",
    accessories: ["charger", "cable"],
    conditionGrade: "B",
    photoUrl: null,
  },
];

export const OPEN_EXCEPTIONS_COUNT = 1;
export const UNACCOUNTED_DEVICES_COUNT = 0;

export const DEVICE_TIMELINE: Record<string, TimelineEntry[]> = {
  "356938035241823": [
    { id: "t-4", txNumber: "TX-2026-00412", type: "T2", date: "12 Oct", title: "Handed to Somchai Jaidee", confirmState: "confirmed" },
    { id: "t-3", txNumber: "TX-2026-00388", type: "T4", date: "08 Oct", title: "Returned by Wichai Suksom", detail: "Condition B", confirmState: "confirmed" },
    { id: "t-2", txNumber: "TX-2026-00210", type: "T1", date: "02 Sep", title: "Issued to Rayong site", confirmState: "confirmed" },
    { id: "t-1", txNumber: "TX-2026-00001", type: "T1", date: "28 Aug", title: "Registered", confirmState: "confirmed" },
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
