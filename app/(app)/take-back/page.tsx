"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { StepHeader } from "@/components/transaction/StepHeader";
import { DevicePicker } from "@/components/device/DevicePicker";
import { AccessoryChecklist } from "@/components/transaction/AccessoryChecklist";
import { ConditionGrade } from "@/components/transaction/ConditionGrade";
import { EvidenceCapture } from "@/components/transaction/EvidenceCapture";
import { SummaryReadback } from "@/components/transaction/SummaryReadback";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { CURRENT_SITE_ID, assignedAtSite, getHolderById } from "@/lib/mock-data";
import { ACCESSORY_LABELS, deviceLabel, selectedAccessories, DEFAULT_ACCESSORIES } from "@/lib/codes";
import type { AccessoryKey, ConditionGradeKey, Device } from "@/types";

const TOTAL_STEPS = 3;
const ALLOWED_LEVELS = ["L2", "L3", "L4"] as const;

export default function TakeBackPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [device, setDevice] = useState<Device | null>(null);
  const [accessories, setAccessories] = useState<Record<AccessoryKey, boolean>>(DEFAULT_ACCESSORIES);
  const [condition, setCondition] = useState<ConditionGradeKey>("A");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const assigned = assignedAtSite(CURRENT_SITE_ID);
  const holder = device ? getHolderById(device.currentHolderId) : undefined;

  function goBack() {
    if (step === 1) router.push("/");
    else setStep(step - 1);
  }

  if (submitted && device) {
    return (
      <RequireLevel allow={[...ALLOWED_LEVELS]}>
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-semibold text-neutral-900">Took back {device.model}</p>
            <p className="mt-1 text-sm text-neutral-600">Waiting for confirmation</p>
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
        <StepHeader title="Take back a phone" step={step} totalSteps={TOTAL_STEPS} onBack={goBack} />

        <div className="flex flex-col gap-5 px-4 py-5">
          {step === 1 && (
            <DevicePicker
              devices={assigned}
              selectedId={device?.id ?? null}
              onSelect={(d) => setDevice(d)}
              statusLabel={(d) => getHolderById(d.currentHolderId)?.name ?? "Assigned"}
            />
          )}

          {step === 2 && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-800">Accessories returned</p>
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

          {step === 3 && device && (
            <SummaryReadback
              lines={[
                deviceLabel(device),
                `Returned by ${holder?.name ?? "-"}`,
                selectedAccessories(accessories).map((a) => ACCESSORY_LABELS[a]).join(", "),
                `Condition ${condition}`,
              ]}
            />
          )}

          <div className="mt-2">
            {step < TOTAL_STEPS && (
              <button
                type="button"
                disabled={!device}
                onClick={() => setStep(step + 1)}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white disabled:opacity-40"
              >
                Next
              </button>
            )}
            {step === TOTAL_STEPS && (
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white"
              >
                Take back phone
              </button>
            )}
          </div>
        </div>
      </div>
    </RequireLevel>
  );
}
