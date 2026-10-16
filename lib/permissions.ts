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

/** Per spec: L4 "administers users and sites"; L1 is the practical hands-on operator either way. */
export function canManageSites(level: Level): boolean {
  return level === "L1" || level === "L4";
}

/** Holders include site_leader "quasi-users" — same administer-users authority as sites. */
export function canManageHolders(level: Level): boolean {
  return level === "L1" || level === "L4";
}

/** Per spec: model is "device master data", explicitly L1's domain — no L4 mention. */
export function canManageModels(level: Level): boolean {
  return level === "L1";
}

/**
 * Lifecycle decision to retire a device. Spec says retire normally needs a
 * separate L4 approval step; no approval workflow exists yet, so this is a
 * direct action for now — same stand-in pattern as other not-yet-built flows.
 */
export function canRetireDevices(level: Level): boolean {
  return level === "L1" || level === "L4";
}

/** Whether the Admin section is visible at all; each page/route still checks its own permission. */
export function canAccessAdmin(level: Level): boolean {
  return level === "L1" || level === "L4";
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

/**
 * Decides which site an unassigned device goes to — a single, direct
 * action (MVP simplification, no separate site-leader confirm step).
 * Matches spec's "L3 ... transfer between sites"; L4 has the same reach.
 */
export function canAssignSite(level: Level): boolean {
  return level === "L3" || level === "L4";
}
