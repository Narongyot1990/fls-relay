import { CONDITION_GRADES } from "@/lib/codes";
import type { ConditionGradeKey } from "@/types";

interface ConditionGradeProps {
  value: ConditionGradeKey;
  onChange: (value: ConditionGradeKey) => void;
}

export function ConditionGrade({ value, onChange }: ConditionGradeProps) {
  const current = CONDITION_GRADES.find((g) => g.key === value);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        {CONDITION_GRADES.map((grade) => {
          const selected = grade.key === value;
          return (
            <button
              key={grade.key}
              type="button"
              onClick={() => onChange(grade.key)}
              className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-semibold ${
                selected
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-700"
              }`}
            >
              {grade.key}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-neutral-600">
        {value} — {current?.label}
      </p>
    </div>
  );
}
