import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/device/StatusBadge";
import { MdmInfoCard } from "@/components/device/MdmInfoCard";
import { getDeviceByImei, getHolderById, getSiteById } from "@/lib/db/queries";
import { maskedImei } from "@/lib/codes";
import { fieldByKey } from "@/lib/device-model-fields";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ imei: string }>;
}) {
  const { imei } = await params;
  const device = await getDeviceByImei(imei);
  if (!device) notFound();

  const holder = device.currentHolderId ? await getHolderById(device.currentHolderId) : null;
  const site = await getSiteById(device.currentSiteId);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
        <Link
          href="/devices"
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
          aria-label="Back"
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

        <MdmInfoCard imei={device.imei} mdm={device.mdm} />

        {device.customFields && Object.keys(device.customFields).length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-900">Model details</h2>
            <dl className="flex flex-col gap-1.5">
              {Object.entries(device.customFields).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <dt className="text-neutral-500">{fieldByKey(key)?.label ?? key}</dt>
                  <dd className="text-neutral-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-base font-semibold text-neutral-900">Custody history</h2>
          <p className="text-sm text-neutral-500">
            No recorded history yet — the transaction ledger isn&apos;t wired up yet.
          </p>
        </div>
      </div>
    </div>
  );
}
