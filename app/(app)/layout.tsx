import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { RoleSwitcher } from "@/components/layout/RoleSwitcher";
import { CurrentUserProvider } from "@/lib/current-user";
import { listHolders } from "@/lib/db/queries";
import type { CurrentUser } from "@/types";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const siteLeaders = await listHolders({ type: "site_leader" });
  const dynamicUsers: CurrentUser[] = siteLeaders.map((holder) => ({
    id: `siteleader-${holder.id}`,
    name: holder.name,
    level: "L2",
    siteId: holder.siteId,
    scopedSiteIds: [holder.siteId],
  }));

  return (
    <CurrentUserProvider dynamicUsers={dynamicUsers}>
      <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col bg-neutral-50">
        <RoleSwitcher />
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </div>
    </CurrentUserProvider>
  );
}
