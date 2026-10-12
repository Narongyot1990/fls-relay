import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-200 px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-neutral-400" />
      <p className="text-sm text-neutral-600">{message}</p>
      {action}
    </div>
  );
}
