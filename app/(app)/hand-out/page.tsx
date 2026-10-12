"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { StepHeader } from "@/components/transaction/StepHeader";
import { DevicePicker } from "@/components/device/DevicePicker";
import { HolderPicker } from "@/components/transaction/HolderPicker";
import { AccessoryChecklist } from "@/components/transaction/AccessoryChecklist";
import { ConditionGrade } from "@/components/transaction/ConditionGrade";
import { EvidenceCapture } from "@/components/transaction/EvidenceCapture";
import { SignaturePad } from "@/components/transaction/SignaturePad";
import { SummaryReadback } from "@/components/transaction/SummaryReadback";
import { CURRENT_SITE_ID, holdersAtSite, stockAtSite } from "@/lib/mock-data";
import { ACCESSORY_LABELS, DEFAULT_ACCESSORIES, last4 } from "@/lib/codes";
import type { AccessoryKey, ConditionGradeKey, Device, Holder } from "@/types";

const TOTAL_STEPS = 4;

export default function HandOutPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [device, setDevice] = useState<Device | null>(null);
  const [holder, setHolder] = useState<Holder | null>(null);
  const [accessories, setAccessories] = useState<Record<AccessoryKey, boolean>>(DEFAULT_ACCESSORIES);
  const [condition, setCondition] = useState<ConditionGradeKey>("A");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [formAttached, setFormAttached] = useState(false);
  const [signed, setSigned] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const stock = stockAtSite(CURRENT_SITE_ID);
  const drivers = holdersAtSite(CURRENT_SITE_ID);
  const canSubmit = formAttached || signed;

  function goBack() {
    if (step === 1) {
      router.push("/");
    } else {
      setStep(step - 1);
    }
  }

  const accessoryList = (Object.keys(accessories) as AccessoryKey[]).filter((k) => accessories[k]);

  if (submitted && device && holder) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Check className="h-7 w-7" />
        </span>
        <div>
          <p className="text-lg font-semibold text-neutral-900">ส่งให้ {holder.name} แล้ว</p>
          <p className="mt-1 text-sm text-neutral-600">กำลังรอให้เขายืนยันรับเครื่อง</p>
        </div>
        <Link
          href="/"
          className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white"
        >
          กลับหน้าหลัก
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <StepHeader title="มอบโทรศัพท์" step={step} totalSteps={TOTAL_STEPS} onBack={goBack} />

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
              <p className="mb-2 text-sm font-medium text-neutral-800">อุปกรณ์ที่ให้ไปด้วย</p>
              <AccessoryChecklist value={accessories} onChange={setAccessories} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-800">สภาพเครื่อง</p>
              <ConditionGrade value={condition} onChange={setCondition} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-800">รูปเครื่อง</p>
              <EvidenceCapture
                label="ถ่ายรูปเครื่อง"
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
                `${device.model} ····${last4(device.imei)}`,
                `มอบให้ ${holder.name} ${holder.employeeNo}`,
                accessoryList.map((a) => ACCESSORY_LABELS[a]).join(", "),
                `สภาพ ${condition}`,
              ]}
            />
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-800">ใบมอบรับโทรศัพท์บริษัท</p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setFormAttached(true)}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-neutral-300 text-sm text-neutral-700"
                >
                  📎 แนบฟอร์มที่เซ็นแล้ว
                </button>
                <p className="text-center text-sm text-neutral-400">— หรือ —</p>
                <p className="text-sm text-neutral-600">✍ เซ็นบนหน้าจอ</p>
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
              ถัดไป
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              onClick={() => setStep(4)}
              className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-neutral-900 text-base font-medium text-white"
            >
              ถัดไป
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
                มอบโทรศัพท์
              </button>
              {!canSubmit && (
                <p className="mt-2 text-center text-sm text-red-600">ต้องมีฟอร์มที่เซ็นแล้ว</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
