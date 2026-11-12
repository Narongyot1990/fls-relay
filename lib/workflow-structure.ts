/** Planning model from Driver_Phone_Issuing__Return_Process.pdf, pp. 1–5.
 * Independent of legacy L1–L4 permissions. This is not an authorization layer.
 */
export type OperatorRole = "implementation" | "site_leader";
export type WorkflowAudience = OperatorRole | "driver";
export type Scope = { kind: "sites"; siteIds: string[] } | { kind: "all_sites" };

export interface WorkflowAction {
  id: string;
  th: string;
  en: string;
  detail: string;
}

export const WORKFLOW_ACTIONS = {
  dashboard: { id: "dashboard", th: "ภาพรวม", en: "Dashboard", detail: "จำนวนเครื่องตามไซต์" },
  site_tracking: { id: "site_tracking", th: "ติดตามรายไซต์", en: "Site tracking", detail: "จำนวนเครื่องและผู้ถือตามไซต์" },
  inventory: { id: "inventory", th: "อุปกรณ์", en: "Devices", detail: "ค้นหาและดูสถานะเครื่อง" },
  receive: { id: "receive", th: "รับเครื่องเข้าระบบ", en: "Receive devices", detail: "เพิ่มทีละเครื่องหรือนำเข้าไฟล์" },
  technical: { id: "technical", th: "ตรวจสอบข้อมูลและสภาพเครื่อง", en: "Review device information", detail: "ตรวจเครื่องก่อนจ่ายใหม่" },
  transfer: { id: "transfer", th: "โอนให้หัวหน้าไซต์", en: "Transfer to Site Leader", detail: "ส่งหลายเครื่องให้หัวหน้าไซต์" },
  receipt: { id: "receipt", th: "ยืนยันรับเครื่อง", en: "Confirm receipt", detail: "ยืนยันเครื่องที่ส่งถึงคุณ" },
  issue: { id: "issue", th: "จ่ายเครื่องให้คนขับ", en: "Issue to driver", detail: "มอบโทรศัพท์ให้คนขับ" },
  return: { id: "return", th: "รับคืนเครื่อง", en: "Return", detail: "รับเครื่องที่จ่ายไปคืน" },
  exchange: { id: "exchange", th: "เปลี่ยนเครื่อง", en: "Exchange", detail: "สลับเครื่องของคนขับ" },
  history: { id: "history", th: "ประวัติและเอกสาร", en: "History / Documents", detail: "รายการย้อนหลังและ PDF" },
  policy: { id: "policy", th: "อ่านนโยบายและรับทราบ", en: "Read policy and acknowledge", detail: "อ่านและรับทราบข้อตกลง" },
  /** Merges the former separate Administration and Directory screens: sites, drivers and Site Leaders in one place. */
  directory: { id: "directory", th: "สร้างข้อมูล", en: "Create", detail: "จัดการไซต์ คนขับ และหัวหน้าไซต์" },
} satisfies Record<string, WorkflowAction>;

export type WorkflowActionId = keyof typeof WORKFLOW_ACTIONS;

export const WORKFLOW_ROLES: Record<WorkflowAudience, {
  th: string; en: string; scope: string; note: string; actions: WorkflowActionId[];
  /** Shown directly on the main menu; the rest of `actions` lives behind the "More" tile. */
  primaryActions: WorkflowActionId[];
}> = {
  implementation: {
    th: "ทีมดำเนินการ", en: "Implementation Team", scope: "ส่วนกลาง ไม่มีไซต์สังกัด ดูและดำเนินงานทุกไซต์ตามสิทธิ์ รวมสิทธิ์ของ IT และผู้ดูแลระบบไว้ในบทบาทเดียว",
    note: "รับเครื่อง โอนไปหัวหน้าไซต์ หรือจ่ายตรงให้คนขับได้ รับคืนและเปลี่ยนเครื่องในขอบเขตเดียวกัน พร้อมดูแลไซต์และบุคลากร",
    actions: ["dashboard", "receive", "inventory", "site_tracking", "transfer", "issue", "return", "exchange", "history", "directory"],
    primaryActions: ["transfer", "inventory", "site_tracking", "directory"],
  },
  site_leader: {
    th: "หัวหน้าไซต์", en: "Site Leader", scope: "มีไซต์สังกัด ดูเฉพาะเครื่อง คนขับ และรายการในไซต์ตนเอง",
    note: "เป็นทั้งผู้ใช้ระบบและผู้รับดูแลสต็อก การรับเครื่องเข้าไซต์ไม่ต้องลงนามนโยบายคนขับ",
    actions: ["dashboard", "receipt", "inventory", "site_tracking", "issue", "return", "exchange", "history"],
    primaryActions: ["issue", "return", "exchange"],
  },
  driver: {
    th: "คนขับ", en: "Driver", scope: "การส่งมอบและเอกสารของตนเอง",
    note: "เสนอให้รับทราบบนหน้าจอของผู้ปฏิบัติงานก่อน ยังไม่ต้องมีบัญชีหรือหน้าเมนูส่วนตัว การเข้าถึงเอกสารภายหลังต้องควบคุมสิทธิ์",
    actions: ["policy"],
    primaryActions: [],
  },
};
