import type { DeviceStatus } from "@/types";
import { STATUS_LABELS } from "@/lib/codes";

interface StatusBadgeProps {
  status: DeviceStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, dotClass } = STATUS_LABELS[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-800">
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
