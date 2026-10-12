"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { userHeaders } from "@/lib/api-client";
import { MDM_MANAGEMENT_MODE_LABELS, MDM_OWNERSHIP_LABELS } from "@/lib/codes";
import type { Device, MdmComplianceState, MdmManagementMode, MdmOwnershipType } from "@/types";

const MANAGEMENT_MODES: MdmManagementMode[] = ["dedicated", "fully_managed"];
const OWNERSHIP_TYPES: MdmOwnershipType[] = ["corporate", "personal"];
const COMPLIANCE_STATES: MdmComplianceState[] = ["compliant", "noncompliant", "unknown"];

export default function EditMdmInfoPage() {
  const router = useRouter();
  const params = useParams<{ imei: string }>();
  const { user } = useCurrentUser();

  const [device, setDevice] = useState<Device | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [deviceName, setDeviceName] = useState("");
  const [managedBy, setManagedBy] = useState("Intune");
  const [ownershipType, setOwnershipType] = useState<MdmOwnershipType>("corporate");
  const [managementMode, setManagementMode] = useState<MdmManagementMode>("dedicated");
  const [complianceState, setComplianceState] = useState<MdmComplianceState>("unknown");
  const [osPlatform, setOsPlatform] = useState("Android");
  const [osVersion, setOsVersion] = useState("");
  const [primaryUserUpn, setPrimaryUserUpn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/devices/${params.imei}`)
      .then((r) => {
        if (!r.ok) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data?.device) return;
        const d: Device = data.device;
        setDevice(d);
        if (d.mdm) {
          setDeviceName(d.mdm.deviceName);
          setManagedBy(d.mdm.managedBy);
          setOwnershipType(d.mdm.ownershipType);
          setManagementMode(d.mdm.managementMode);
          setComplianceState(d.mdm.complianceState);
          setOsPlatform(d.mdm.osPlatform);
          setOsVersion(d.mdm.osVersion);
          setPrimaryUserUpn(d.mdm.primaryUserUpn ?? "");
        }
      });
  }, [params.imei]);

  const canSubmit = !submitting && deviceName.trim() !== "" && osVersion.trim() !== "";

  async function handleSubmit() {
    if (!device) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/devices/${device.imei}/mdm`, {
        method: "PATCH",
        headers: userHeaders(user),
        body: JSON.stringify({
          deviceName,
          managedBy,
          ownershipType,
          managementMode,
          complianceState,
          osPlatform,
          osVersion,
          primaryUserUpn,
          updatedBy: user.name,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save MDM info");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="text-sm text-neutral-600">Device not found</p>
        <Link href="/devices" className="text-sm font-medium text-neutral-900 underline">
          Back to phones
        </Link>
      </div>
    );
  }

  if (!device) {
    return <div className="h-40 animate-pulse bg-neutral-100" />;
  }

  if (submitted) {
    return (
      <RequireLevel allow={["L1"]}>
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-7 w-7" />
          </span>
          <p className="text-lg font-semibold text-neutral-900">MDM info saved</p>
          <Link
            href={`/devices/${device.imei}`}
            className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white"
          >
            Back to device
          </Link>
        </div>
      </RequireLevel>
    );
  }

  return (
    <RequireLevel allow={["L1"]}>
      <div className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push(`/devices/${device.imei}`)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold text-neutral-900">MDM info · {device.model}</h1>
        </div>

        <div className="flex flex-col gap-4 px-4 py-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Device name (from MDM console)</span>
            <input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              placeholder="e.g. GALAXY-A07-R83L30S4P1P"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Managed by</span>
            <input
              value={managedBy}
              onChange={(e) => setManagedBy(e.target.value)}
              className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              placeholder="Intune"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Ownership</span>
            <select
              value={ownershipType}
              onChange={(e) => setOwnershipType(e.target.value as MdmOwnershipType)}
              className="min-h-[48px] rounded-xl border border-neutral-300 bg-white px-3 text-base"
            >
              {OWNERSHIP_TYPES.map((o) => (
                <option key={o} value={o}>
                  {MDM_OWNERSHIP_LABELS[o]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Management mode</span>
            <select
              value={managementMode}
              onChange={(e) => setManagementMode(e.target.value as MdmManagementMode)}
              className="min-h-[48px] rounded-xl border border-neutral-300 bg-white px-3 text-base"
            >
              {MANAGEMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {MDM_MANAGEMENT_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">Compliance</span>
            <select
              value={complianceState}
              onChange={(e) => setComplianceState(e.target.value as MdmComplianceState)}
              className="min-h-[48px] rounded-xl border border-neutral-300 bg-white px-3 text-base"
            >
              {COMPLIANCE_STATES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">OS platform</span>
              <input
                value={osPlatform}
                onChange={(e) => setOsPlatform(e.target.value)}
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-neutral-800">OS version</span>
              <input
                value={osVersion}
                onChange={(e) => setOsVersion(e.target.value)}
                className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-neutral-800">
              Primary user UPN (only if fully managed, single-user)
            </span>
            <input
              value={primaryUserUpn}
              onChange={(e) => setPrimaryUserUpn(e.target.value)}
              className="min-h-[48px] rounded-xl border border-neutral-300 px-3 text-base outline-none"
              placeholder="name@fls-group.com"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="mt-2 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
          >
            {submitting ? "Saving…" : "Save MDM info"}
          </button>
        </div>
      </div>
    </RequireLevel>
  );
}
