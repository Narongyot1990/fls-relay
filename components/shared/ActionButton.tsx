import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface ActionButtonProps {
  href: string;
  icon: LucideIcon;
  label: string;
}

export function ActionButton({ href, icon: Icon, label }: ActionButtonProps) {
  return (
    <Link
      href={href}
      className="flex min-h-[64px] w-full items-center gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-4 active:bg-neutral-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
        <Icon className="h-6 w-6" />
      </span>
      <span className="flex-1 text-left text-base font-medium text-neutral-900">{label}</span>
      <ChevronRight className="h-5 w-5 shrink-0 text-neutral-400" />
    </Link>
  );
}
