"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, MapPin } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { StepHeader } from "@/components/transaction/StepHeader";
import { DevicePicker } from "@/components/device/DevicePicker";
import { HolderPicker } from "@/components/transaction/HolderPicker";
import { AccessoryChecklist } from "@/components/transaction/AccessoryChecklist";
import { ConditionGrade } from "@/components/transaction/ConditionGrade";
import { EvidenceCapture } from "@/components/transaction/EvidenceCapture";
import { SignaturePad } from "@/components/transaction/SignaturePad";
import { SummaryReadback } from "@/components/transaction/SummaryReadback";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { useCurrentUser } from "@/lib/current-user";
import { ACCESSORY_LABELS, deviceLabel, selectedAccessories, DEFAULT_ACCESSORIES } from "@/lib/codes";
import type { AccessoryKey, ConditionGradeKey, Device, Holder } from "@/types";

const TOTAL_STEPS = 4;
const ALLOWED_LEVELS = ["L2", "L3", "L4"] as const;

export default function HandOutPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [step, setStep] = useState(1);
  const [device, setDevice] = useState<Device | null>(null);
  const [holder, setHolder] = useState<Holder | null>(null);
  const [accessories, setAccessories] = useState<Record<AccessoryKey, boolean>>(DEFAULT_ACCESSORIES);
  const [condition, setCondition] = useState<ConditionGradeKey>("A");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [formAttached, setFormAttached] = useState(false);
  const [signed, setSigned] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [stock, setStock] = useState<Device[]>([]);
  const [drivers, setDrivers] = useState<Holder[]>([]);

  useEffect(() => {
    fetch(`/api/devices?siteId=${user.siteId}&status=in_site_stock`)
      .then((r) => r.json())
      .then((data) => setStock(data.devices ?? []));
    fetch(`/api/holders?siteId=${user.siteId}&type=driver`)
      .then((r) => r.json())
      .then((data) => setDrivers(data.holders ?? []));
  }, [user.siteId]);

  const canSubmit = formAttached || signed;

  if (user.siteId === null) {
    return (
      <RequireLevel allow={[...ALLOWED_LEVELS]}>
        <EmptyState
          icon={MapPin}
          message="This is a per-site task — preview as a Site Leader to try it."
          action={
            <Link href="/" className="text-sm font-medium text-neutral-900 underline">
              Back to home
            </Link>
          }
        />
      </RequireLevel>
    );
  }

  function goBack() {
    if (step === 1) {
      router.push("/");
    } else {
      setStep(step - 1);
    }
  }

  if (submitted && device && holder) {
    return (
      <RequireLevel allow={[...ALLOWED_LEVELS]}>
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-semibold text-neutral-900">Sent to {holder.name}</p>
            <p className="mt-1 text-sm text-neutral-600">Waiting for them to confirm</p>
          </div>
          <Link
            href="/"
            className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white"
          >
            Back to home
          </Link>
        </div>
      </RequireLevel>
    );
  }

  return (
    <RequireLevel allow={[...ALLOWED_LEVELS]}>
      <div className="flex flex-col">
        <StepHeader title="Hand out a phone" step={step} totalSteps={TOTAL_STEPS} onBack={goBack} />

        <div className="flex flex-col gap-5 px-4 py-5">
          {step === 1 && (
            <DevicePicker
              devices={stock}
              selectedId={device?.id ?? null}
              onSelect={(d) => setDevice(d)}
            />
          )}

          {step === 2 && (
            <HolderPicker
              holders={drivers}
              selectedId={holder?.id ?? null}
              onSelect={(h) => setHolder(h)}
            />
          )}

          {step === 3 && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-800">Accessories included</p>
                <AccessoryChecklist value={accessories} onChange={setAccessories} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-800">Condition</p>
                <ConditionGrade value={condition} onChange={setCondition} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-800">Photo of the phone</p>
                <EvidenceCapture
                  label="Take a photo"
                  photoUrl={photoUrl}
                  onCapture={() => setPhotoUrl("mock-photo")}
                  onRemove={() => setPhotoUrl(null)}
                />
              </div>
            </>
          )}

          {step === 4 && device && holder && (
            <>
              <SummaryReadback
                lines={[
                  deviceLabel(device),
                  `to ${holder.name} ${holder.employeeNo}`,
                  selectedAccessories(accessories).map((a) => ACCESSORY_LABELS[a]).join(", "),
                  `Condition ${condition}`,
                ]}
              />
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-800">Company Handout Form</p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setFormAttached(true)}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-neutral-300 text-sm text-neutral-700"
                  >
                    📎 Upload signed form
                  </button>
                  <p className="text-center text-sm text-neutral-400">— or —</p>
                  <p className="text-sm text-neutral-600">✍ Sign on screen</p>
                  <SignaturePad signed={signed} onSigned={setSigned} />
                </div>
              </div>
            </>
          )}

          <div className="mt-2">
            {step < 3 && (
              <button
                type="button"
                disabled={step === 1 ? !device : !holder}
                onClick={() => setStep(step + 1)}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white"
              >
                Next
              </button>
            )}
            {step === 4 && (
              <>
                <button
                  type="button"
                  disabled={!canSubmit}
                  onClick={() => setSubmitted(true)}
                  className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
                >
                  Hand over phone
                </button>
                {!canSubmit && (
                  <p className="mt-2 text-center text-sm text-red-600">Signed form required</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </RequireLevel>
  );
}
