"use client";

import { Inbox } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

export default function InboxPage() {
  // The hand-out/take-back/swap confirmation flow isn't wired to the database
  // yet (site assignment is a direct single step now — see /devices/[imei]/assign),
  // so there is genuinely nothing to confirm here right now.
  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <h1 className="text-xl font-semibold text-neutral-900">Waiting for you</h1>
      <EmptyState icon={Inbox} message="Nothing waiting for confirmation right now" />
    </div>
  );
}
