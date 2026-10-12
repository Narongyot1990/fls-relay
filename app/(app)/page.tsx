import Link from "next/link";
import { ArrowRight, ArrowLeft, Repeat, List, AlertTriangle } from "lucide-react";
import { ActionButton } from "@/components/shared/ActionButton";
import { CURRENT_SITE_ID, PENDING_FOR_ME, DEVICES, getSiteById } from "@/lib/mock-data";

export default function HomePage() {
  const site = getSiteById(CURRENT_SITE_ID);
  const siteDevices = DEVICES.filter((d) => d.currentSiteId === CURRENT_SITE_ID);
  const inStock = siteDevices.filter((d) => d.status === "in_site_stock").length;
  const waitingCount = PENDING_FOR_ME.length;

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">{site?.name}</h1>
        <p className="text-sm text-neutral-500">
          {siteDevices.length} เครื่อง · {inStock} ในสต็อก
        </p>
      </div>

      {waitingCount > 0 && (
        <Link
          href="/inbox"
          className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-amber-800"
        >
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium">{waitingCount} รายการรอให้คุณยืนยัน</span>
        </Link>
      )}

      <div className="flex flex-col gap-3">
        <ActionButton href="/hand-out" icon={ArrowRight} label="มอบโทรศัพท์" />
        <ActionButton href="/take-back" icon={ArrowLeft} label="รับโทรศัพท์คืน" />
        <ActionButton href="/swap" icon={Repeat} label="เปลี่ยนโทรศัพท์" />
        <ActionButton href="/devices" icon={List} label="โทรศัพท์ทั้งหมดในไซต์" />
      </div>
    </div>
  );
}
