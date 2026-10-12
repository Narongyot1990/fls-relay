import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col bg-neutral-50">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
