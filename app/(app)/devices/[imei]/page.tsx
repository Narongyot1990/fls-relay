import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/device/StatusBadge";
import { CustodyTimeline } from "@/components/device/CustodyTimeline";
import { DEVICE_TIMELINE, getDeviceByImei, getHolderById, getSiteById } from "@/lib/mock-data";
import { maskedImei } from "@/lib/codes";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ imei: string }>;
}) {
  const { imei } = await params;
  const device = getDeviceByImei(imei);
  if (!device) notFound();

  const holder = getHolderById(device.currentHolderId);
  const site = getSiteById(device.currentSiteId);
  const timeline = DEVICE_TIMELINE[device.imei] ?? [];

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
        <Link
          href="/devices"
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
          aria-label="ย้อนกลับ"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-base font-semibold text-neutral-900">{device.model}</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 py-5">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm text-neutral-500">IMEI {maskedImei(device.imei)}</p>
          <div className="mt-2">
            <StatusBadge status={device.status} />
          </div>
          {holder && (
            <p className="mt-1 text-sm text-neutral-700">
              {holder.name} · {site?.name}
            </p>
          )}
          {!holder && site && <p className="mt-1 text-sm text-neutral-700">{site.name}</p>}
        </div>

        <div>
          <h2 className="mb-3 text-base font-semibold text-neutral-900">ประวัติการถือครอง</h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-neutral-500">ยังไม่มีประวัติสำหรับเครื่องนี้</p>
          ) : (
            <CustodyTimeline entries={timeline} />
          )}
        </div>
      </div>
    </div>
  );
}
