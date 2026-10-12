import type { ReactNode } from "react";

interface SummaryReadbackProps {
  lines: ReactNode[];
}

export function SummaryReadback({ lines }: SummaryReadbackProps) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
      {lines.map((line, i) => (
        <p key={i} className="text-base text-neutral-900">
          {line}
        </p>
      ))}
    </div>
  );
}
