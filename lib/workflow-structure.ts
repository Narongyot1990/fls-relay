/** Planning model from Driver_Phone_Issuing__Return_Process.pdf, pp. 1–5.
 * Independent of legacy L1–L4 permissions. This is not an authorization layer.
 */
export type OperatorRole = "it" | "implementation" | "site_leader";
export type WorkflowAudience = OperatorRole | "driver" | "system_admin";
export type Scope = { kind: "sites"; siteIds: string[] } | { kind: "all_sites" };

export interface OperatorAccount {
  id: string;
  employeeId: string;
  displayName: string;
  roles: OperatorRole[];
  /** Central roles have all_sites and no affiliation; Site Leaders use their assigned site. */
  scope: Scope;
  active: boolean;
  /** Administrative authority does not grant handover authority. */
  systemAdmin: boolean;
}

export interface WorkflowAction {
  id: string;
  th: string;
  en: string;
  detail: string;
}

export const WORKFLOW_ACTIONS = {
  dashboard: { id: "dashboard", th: "ภาพรวม", en: "Dashboard", detail: "จำนวนเครื่องตามไซต์" },
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
  users: { id: "users", th: "ผู้ดูแลระบบ", en: "Administration", detail: "จัดการไซต์และบุคลากร" },
  directory: { id: "directory", th: "ทำเนียบ", en: "Directory", detail: "รายชื่อคนขับและหัวหน้าไซต์" },
} satisfies Record<string, WorkflowAction>;

export type WorkflowActionId = keyof typeof WORKFLOW_ACTIONS;

export const WORKFLOW_ROLES: Record<WorkflowAudience, {
  th: string; en: string; scope: string; note: string; actions: WorkflowActionId[];
}> = {
  it: {
    th: "ฝ่าย IT", en: "IT", scope: "ส่วนกลาง ไม่มีไซต์สังกัด ดูภาพรวมทุกไซต์หรือกรองรายไซต์",
    note: "เสนอให้รับเครื่องและดูแลข้อมูลได้ ต้องยืนยันสิทธิ์นำเข้าและผู้มีอำนาจอนุญาตจ่ายใหม่ ไม่ให้สิทธิ์ส่งมอบโดยอัตโนมัติ",
    actions: ["dashboard", "receive", "inventory", "return", "history", "directory"],
  },
  implementation: {
    th: "ทีมดำเนินการ", en: "Implementation Team", scope: "ส่วนกลาง ไม่มีไซต์สังกัด ดูและดำเนินงานทุกไซต์ตามสิทธิ์",
    note: "รับเครื่อง โอนไปหัวหน้าไซต์ หรือจ่ายตรงให้คนขับได้ เสนอให้รับคืนและเปลี่ยนเครื่องในขอบเขตเดียวกัน",
    actions: ["dashboard", "receive", "inventory", "transfer", "issue", "return", "exchange", "history"],
  },
  site_leader: {
    th: "หัวหน้าไซต์", en: "Site Leader", scope: "มีไซต์สังกัด ดูเฉพาะเครื่อง คนขับ และรายการในไซต์ตนเอง",
    note: "เป็นทั้งผู้ใช้ระบบและผู้รับดูแลสต็อก การรับเครื่องเข้าไซต์ไม่ต้องลงนามนโยบายคนขับ",
    actions: ["dashboard", "receipt", "inventory", "issue", "return", "exchange", "history"],
  },
  driver: {
    th: "คนขับ", en: "Driver", scope: "การส่งมอบและเอกสารของตนเอง",
    note: "เสนอให้รับทราบบนหน้าจอของผู้ปฏิบัติงานก่อน ยังไม่ต้องมีบัญชีหรือหน้าเมนูส่วนตัว การเข้าถึงเอกสารภายหลังต้องควบคุมสิทธิ์",
    actions: ["policy"],
  },
  system_admin: {
    th: "ผู้ดูแลระบบ", en: "System Admin", scope: "ส่วนกลาง ไม่มีไซต์สังกัด ดูภาพรวมทุกไซต์หรือกรองรายไซต์ และจัดการบัญชี สิทธิ์ ข้อมูลอ้างอิง",
    note: "เป็นสิทธิ์เสริม แยกจากบทบาทปฏิบัติงาน ไม่ได้สิทธิ์จ่ายเครื่องหรือดูเอกสารทุกฉบับโดยอัตโนมัติ",
    actions: ["dashboard", "inventory", "return", "history", "users", "directory"],
  },
};
