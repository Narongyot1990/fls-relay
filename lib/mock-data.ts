import type { CurrentUser, PendingItem } from "@/types";

/**
 * What's left here is intentionally still mock:
 * - META_USERS / DEFAULT_USER_ID back the dev-only role switcher (lib/current-user.tsx).
 *   There is no real auth yet, so "who am I" has to come from somewhere. These 3 are
 *   the roles that aren't bound to one site (`siteId: null`, `scopedSiteIds: []` meaning
 *   "every site" — see sitesInScope()). Site Leader identities are NOT listed here: they
 *   are generated dynamically from real `site_leader` holders (app/(app)/layout.tsx reads
 *   them server-side and passes them into CurrentUserProvider as `dynamicUsers`), since a
 *   static file can never hardcode a future, admin-created site's id.
 * - PENDING_FOR_ME, OPEN_EXCEPTIONS_COUNT, UNACCOUNTED_DEVICES_COUNT stand in for the
 *   transactions/exceptions ledger, which hasn't been migrated to MongoDB yet.
 */

export const META_USERS: CurrentUser[] = [
  { id: "user-l1", name: "IT", level: "L1", siteId: null, scopedSiteIds: [] },
  { id: "user-l3", name: "Ops Supervisor", level: "L3", siteId: null, scopedSiteIds: [] },
  { id: "user-l4", name: "Management", level: "L4", siteId: null, scopedSiteIds: [] },
];

export const DEFAULT_USER_ID = "user-l1";

export const PENDING_FOR_ME: PendingItem[] = [
  {
    id: "p-1",
    txNumber: "TX-2026-00412",
    type: "T2",
    deviceModel: "Samsung Galaxy A07",
    imeiLast4: "4821",
    fromLabel: "Site leader Rayong",
    createdAt: "Today 07:14",
    accessories: ["charger", "cable", "case", "sim"],
    conditionGrade: "A",
    photoUrl: null,
  },
  {
    id: "p-2",
    txNumber: "TX-2026-00413",
    type: "T4",
    deviceModel: "Samsung Galaxy A07",
    imeiLast4: "4830",
    fromLabel: "Wichai Suksom",
    createdAt: "Today 06:40",
    accessories: ["charger", "cable"],
    conditionGrade: "B",
    photoUrl: null,
  },
];

export const OPEN_EXCEPTIONS_COUNT = 1;
export const UNACCOUNTED_DEVICES_COUNT = 0;
