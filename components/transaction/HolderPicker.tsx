"use client";

import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import type { Holder } from "@/types";

interface HolderPickerProps {
  holders: Holder[];
  selectedId: string | null;
  onSelect: (holder: Holder) => void;
  onHandToSiteLeader?: () => void;
}

export function HolderPicker({ holders, selectedId, onSelect, onHandToSiteLeader }: HolderPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = holders.filter((h) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return h.name.toLowerCase().includes(q) || h.employeeNo.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3">
        <Search className="h-5 w-5 text-neutral-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search driver"
          className="w-full bg-transparent text-base outline-none placeholder:text-neutral-400"
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-500">
            No matching driver
          </p>
        )}
        {filtered.map((holder) => {
          const selected = holder.id === selectedId;
          return (
            <button
              key={holder.id}
              type="button"
              onClick={() => onSelect(holder)}
              className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left ${
                selected ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 bg-white"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? "border-neutral-900" : "border-neutral-300"
                }`}
              >
                {selected && <span className="h-2.5 w-2.5 rounded-full bg-neutral-900" />}
              </span>
              <span className="flex-1 text-base font-medium text-neutral-900">{holder.name}</span>
              <span className="text-sm text-neutral-500">{holder.employeeNo}</span>
            </button>
          );
        })}
      </div>

      {onHandToSiteLeader && (
        <button
          type="button"
          onClick={onHandToSiteLeader}
          className="flex min-h-[56px] w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left"
        >
          <span className="text-base text-neutral-900">Or hand to another site leader</span>
          <ArrowRight className="h-5 w-5 text-neutral-400" />
        </button>
      )}
    </div>
  );
}
