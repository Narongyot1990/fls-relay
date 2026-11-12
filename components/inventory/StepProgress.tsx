"use client";

import { Check } from "@/components/shared/BrandIcon";

export function StepProgress({ step, labels }: { step: number; labels: string[] }) {
  return <ol className="grid grid-cols-3 gap-2">{labels.map((label, index) => <li key={index} aria-current={step === index + 1 ? "step" : undefined} className={`flex items-center gap-2 border-b-2 pb-4 text-xs sm:text-sm ${step >= index + 1 ? "border-blue-600 text-blue-600" : "border-slate-200 text-slate-400"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${step >= index + 1 ? "bg-blue-600 text-white" : "bg-slate-200"}`}>{step > index + 1 ? <Check size={13} /> : index + 1}</span>{label}</li>)}</ol>;
}
