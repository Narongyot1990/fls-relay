"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { StepHeader } from "@/components/transaction/StepHeader";
import { DevicePicker } from "@/components/device/DevicePicker";
import { ConditionGrade } from "@/components/transaction/ConditionGrade";
import { SummaryReadback } from "@/components/transaction/SummaryReadback";
import { RequireLevel } from "@/components/shared/RequireLevel";
import { CURRENT_SITE_ID, assignedAtSite, getHolderById, stockAtSite } from "@/lib/mock-data";
import { REASON_LABELS, deviceLabel } from "@/lib/codes";
import type { ConditionGradeKey, Device, ReasonCode } from "@/types";

const TOTAL_STEPS = 4;
const ALLOWED_LEVELS = ["L2", "L3", "L4"] as const;

const SWAP_REASONS: ReasonCode[] = ["malfunction", "damage", "upgrade"];

export default function SwapPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [outgoing, setOutgoing] = useState<Device | null>(null);
  const [incoming, setIncoming] = useState<Device | null>(null);
  const [reason, setReason] = useState<ReasonCode>("malfunction");
  const [condition, setCondition] = useState<ConditionGradeKey>("C");
  const [submitted, setSubmitted] = useState(false);

  const assigned = assignedAtSite(CURRENT_SITE_ID);
  const stock = stockAtSite(CURRENT_SITE_ID).filter((d) => d.id !== outgoing?.id);
  const holder = outgoing ? getHolderById(outgoing.currentHolderId) : undefined;

  function goBack() {
    if (step === 1) router.push("/");
    else setStep(step - 1);
  }

  if (submitted && outgoing && incoming && holder) {
    return (
      <RequireLevel allow={[...ALLOWED_LEVELS]}>
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="h-7 w-7" />
          </span>
          <div>
            <p className="text-lg font-semibold text-neutral-900">Swapped for {holder.name}</p>
            <p className="mt-1 text-sm text-neutral-600">
              Took back {deviceLabel(outgoing)} and sent {deviceLabel(incoming)}, waiting for
              confirmation
            </p>
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
        <StepHeader title="Swap a phone" step={step} totalSteps={TOTAL_STEPS} onBack={goBack} />

        <div className="flex flex-col gap-5 px-4 py-5">
          {step === 1 && (
            <>
              <p className="text-sm text-neutral-500">Phone to take back</p>
              <DevicePicker
                devices={assigned}
                selectedId={outgoing?.id ?? null}
                onSelect={(d) => setOutgoing(d)}
                statusLabel={(d) => getHolderById(d.currentHolderId)?.name ?? "Assigned"}
              />
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-neutral-500">Replacement phone</p>
              <DevicePicker
                devices={stock}
                selectedId={incoming?.id ?? null}
                onSelect={(d) => setIncoming(d)}
              />
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-800">Reason for the swap</p>
                <div className="flex flex-wrap gap-2">
                  {SWAP_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`rounded-full border px-3 py-1.5 text-sm ${
                        reason === r
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 text-neutral-700"
                      }`}
                    >
                      {REASON_LABELS[r]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-neutral-800">Condition of the returned phone</p>
                <ConditionGrade value={condition} onChange={setCondition} />
              </div>
            </>
          )}

          {step === 4 && outgoing && incoming && (
            <SummaryReadback
              lines={[
                `Take back ${deviceLabel(outgoing)} from ${holder?.name ?? "-"}`,
                `Hand out ${deviceLabel(incoming)}`,
                `Reason ${REASON_LABELS[reason]}`,
                `Returned phone condition ${condition}`,
              ]}
            />
          )}

          <div className="mt-2">
            {step < TOTAL_STEPS && (
              <button
                type="button"
                disabled={step === 1 ? !outgoing : step === 2 ? !incoming : false}
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
                Swap phone
              </button>
            )}
          </div>
        </div>
      </div>
    </RequireLevel>
  );
}
