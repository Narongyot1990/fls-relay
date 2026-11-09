"use client";

import { MapPin, Users, ClipboardList, History } from "@/components/shared/BrandIcon";
import { useLanguage } from "@/components/shared/LanguageProvider";
import type { DirectoryPerson, DirectorySite } from "@/lib/directory";

export function AdministrationPanel({ people, sites, deviceCount, onPeople, onSites, onInventory, onHistory }: {
  people: DirectoryPerson[]; sites: DirectorySite[]; deviceCount: number;
  onPeople: () => void; onSites: () => void; onInventory: () => void; onHistory: () => void;
}) {
  const { t } = useLanguage();
  const cards = [
    { title: t("บุคลากร", "People"), detail: t("เพิ่ม แก้ไข ปิดใช้งาน และลบรายชื่อที่ยังไม่เคยใช้", "Add, edit, deactivate and delete unused staff records"), value: people.length, icon: Users, action: onPeople },
    { title: t("ไซต์", "Sites"), detail: t("จัดการชื่อ รหัส และสถานะไซต์", "Manage site names, codes and status"), value: sites.length, icon: MapPin, action: onSites },
    { title: t("โทรศัพท์", "Device inventory"), detail: t("ตรวจสถานะ ไซต์ และผู้ถือเครื่อง", "Track availability, location and current holders"), value: deviceCount, icon: ClipboardList, action: onInventory },
    { title: t("ประวัติการเคลื่อนไหว", "Transaction history"), detail: t("ดูการจ่าย โอน รับคืน และเปลี่ยนเครื่อง", "Review issues, transfers, returns and exchanges"), value: null, icon: History, action: onHistory },
  ];
  return <div className="space-y-5"><div><h1 className="text-2xl font-semibold">{t("ผู้ดูแลระบบ", "Administration")}</h1><p className="mt-2 text-sm leading-6 text-slate-500">{t("จัดการข้อมูลอ้างอิงและติดตามโทรศัพท์ในขอบเขตที่เลือก", "Manage reference data and track phones in the selected scope.")}</p></div><div className="grid gap-4 sm:grid-cols-2">{cards.map(({ title, detail, value, icon: Icon, action }) => <button key={title} type="button" onClick={action} className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"><div className="flex items-center justify-between gap-3"><Icon size={36} />{value !== null && <strong className="text-3xl text-slate-800">{value}</strong>}</div><h2 className="mt-5 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p><span className="mt-5 inline-block text-sm font-medium text-blue-700">{t("เปิดจัดการ →", "Open →")}</span></button>)}</div><p className="rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">{t("รายการที่มีประวัติจะเก็บไว้ติดตามย้อนหลัง ใช้ปิดใช้งานเมื่อต้องการนำออกจากการใช้งานประจำวัน", "Keep records with history for tracking. Deactivate them to remove them from daily operational selectors.")}</p></div>;
}
