import { ACCESSORY_LABELS, ACCESSORY_ORDER } from "@/lib/codes";
import type { AccessoryKey } from "@/types";

interface AccessoryChecklistProps {
  value: Record<AccessoryKey, boolean>;
  onChange: (value: Record<AccessoryKey, boolean>) => void;
}

export function AccessoryChecklist({ value, onChange }: AccessoryChecklistProps) {
  function toggle(key: AccessoryKey) {
    onChange({ ...value, [key]: !value[key] });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {ACCESSORY_ORDER.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => toggle(key)}
          className="flex min-h-[48px] items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3"
        >
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${
              value[key] ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
            }`}
          >
            {value[key] && <span className="h-2 w-2 rounded-sm bg-white" />}
          </span>
          <span className="text-sm text-neutral-900">{ACCESSORY_LABELS[key]}</span>
        </button>
      ))}
    </div>
  );
}
