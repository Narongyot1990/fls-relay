import { Check } from "lucide-react";
import type { TimelineEntry } from "@/types";

interface CustodyTimelineProps {
  entries: TimelineEntry[];
}

export function CustodyTimeline({ entries }: CustodyTimelineProps) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                  index === 0 ? "bg-neutral-900" : "bg-neutral-300"
                }`}
              />
              {!isLast && <span className="w-px flex-1 bg-neutral-200" />}
            </div>
            <button
              type="button"
              className="mb-5 flex-1 text-left"
            >
              <p className="text-xs text-neutral-500">{entry.date}</p>
              <p className="text-base font-medium text-neutral-900">{entry.title}</p>
              {entry.detail && <p className="text-sm text-neutral-600">{entry.detail}</p>}
              {entry.confirmState === "confirmed" && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Confirmed
                </p>
              )}
              {entry.confirmState === "pending" && (
                <p className="mt-0.5 text-sm text-amber-600">Waiting for confirmation</p>
              )}
              {entry.isCorrection && (
                <p className="mt-0.5 text-sm text-neutral-500">
                  Correction referencing {entry.correctsTxNumber}
                </p>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
