import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { CurrentUserProvider } from "@/lib/current-user";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProvider>
      <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col bg-neutral-50">
        <RoleSwitcher />
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </div>
    </CurrentUserProvider>
  );
}
