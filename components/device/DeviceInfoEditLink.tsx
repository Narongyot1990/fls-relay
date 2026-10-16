"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { useCurrentUser } from "@/lib/current-user";
import { canRegisterDevices } from "@/lib/permissions";

export function DeviceInfoEditLink({ imei }: { imei: string }) {
  const { user } = useCurrentUser();
  if (!canRegisterDevices(user.level)) return null;

  return (
    <Link href={`/devices/${imei}/edit`} className="flex items-center gap-1 text-sm text-neutral-600">
      <Pencil className="h-3.5 w-3.5" />
      Edit
    </Link>
  );
}
