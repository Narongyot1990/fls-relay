"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Smartphone, Users } from "lucide-react";
import { ActionButton } from "@/components/shared/ActionButton";
import { RequireLevel } from "@/components/shared/RequireLevel";

export default function AdminPage() {
  const router = useRouter();

  return (
    <RequireLevel allow={["L1", "L4"]}>
      <div className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 active:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold text-neutral-900">Catalog admin</h1>
        </div>

        <div className="flex flex-col gap-3 px-4 py-5">
          <ActionButton href="/admin/sites" icon={MapPin} label="Manage sites" />
          <ActionButton href="/admin/holders" icon={Users} label="Manage people" />
          <ActionButton href="/admin/models" icon={Smartphone} label="Manage phone models" />
        </div>
      </div>
    </RequireLevel>
  );
}
