import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface StepHeaderProps {
  title: string;
  step: number;
  totalSteps: number;
  backHref?: string;
  onBack?: () => void;
}

export function StepHeader({ title, step, totalSteps, backHref, onBack }: StepHeaderProps) {
  const backButtonClass =
    "flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100";

  return (
    <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
      {onBack ? (
        <button type="button" onClick={onBack} className={backButtonClass} aria-label="ย้อนกลับ">
          <ChevronLeft className="h-6 w-6" />
        </button>
      ) : (
        <Link href={backHref ?? "/"} className={backButtonClass} aria-label="ย้อนกลับ">
          <ChevronLeft className="h-6 w-6" />
        </Link>
      )}
      <h1 className="flex-1 text-base font-semibold text-neutral-900">{title}</h1>
      <span className="text-sm text-neutral-500">
        {step}/{totalSteps}
      </span>
    </div>
  );
}
