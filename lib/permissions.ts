import type { CurrentUser, Level } from "@/types";

export const LEVEL_LABELS: Record<Level, string> = {
  L1: "IT",
  L2: "Site Leader",
  L3: "Ops Supervisor",
  L4: "Management",
};

export function canRegisterDevices(level: Level): boolean {
  return level === "L1";
}

/** Creating/editing the shared site and phone-model catalog — IT only. */
export function canManageCatalog(level: Level): boolean {
  return level === "L1";
}

export function canHandleHandovers(level: Level): boolean {
  return level === "L2" || level === "L3" || level === "L4";
}

export function canRunStockCount(level: Level): boolean {
  return level === "L3" || level === "L4";
}

export function canApprove(level: Level): boolean {
  return level === "L4";
}

export function canExportReports(level: Level): boolean {
  return level === "L4";
}

/** Site leaders (L2) are scoped to their one site; every other role works across all sites. */
export function canViewAllSites(level: Level): boolean {
  return level === "L1" || level === "L3" || level === "L4";
}

/** Sites a user may act on. Empty array from the user record means every site. */
export function sitesInScope(user: CurrentUser): string[] | "all" {
  return user.scopedSiteIds.length === 0 ? "all" : user.scopedSiteIds;
}

export function isSiteInScope(user: CurrentUser, siteId: string): boolean {
  const scope = sitesInScope(user);
  return scope === "all" || scope.includes(siteId);
}
