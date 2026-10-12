"use client";

import { Camera } from "lucide-react";
import type { Device } from "@/types";
import { last4 } from "@/lib/codes";

interface DevicePickerProps {
  devices: Device[];
  selectedId: string | null;
  onSelect: (device: Device) => void;
  statusLabel?: (device: Device) => string;
}

export function DevicePicker({ devices, selectedId, onSelect, statusLabel }: DevicePickerProps) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-xl bg-neutral-900 text-white text-base font-medium active:bg-neutral-800"
      >
        <Camera className="h-5 w-5" />
        Scan phone
      </button>

      <div className="flex flex-col gap-2">
        <p className="text-sm text-neutral-500">or pick from your stock</p>
        {devices.length === 0 && (
          <p className="rounded-xl border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-500">
            No phones in your stock
          </p>
        )}
        {devices.map((device) => {
          const selected = device.id === selectedId;
          return (
            <button
              key={device.id}
              type="button"
              onClick={() => onSelect(device)}
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
              <span className="flex-1">
                <span className="block text-base font-medium text-neutral-900">{device.model}</span>
                <span className="block text-sm text-neutral-500">
                  ····{last4(device.imei)} · {statusLabel ? statusLabel(device) : "in stock"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
