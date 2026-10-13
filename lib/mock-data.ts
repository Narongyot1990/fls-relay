import type { CurrentUser } from "@/types";

/**
 * META_USERS / DEFAULT_USER_ID back the dev-only role switcher (lib/current-user.tsx).
 * There is no real auth yet, so "who am I" has to come from somewhere. These 3 are
 * the roles that aren't bound to one site (`siteId: null`, `scopedSiteIds: []` meaning
 * "every site" — see sitesInScope()). Site Leader identities are NOT listed here: they
 * are generated dynamically from real `site_leader` holders (app/(app)/layout.tsx reads
 * them server-side and passes them into CurrentUserProvider as `dynamicUsers`), since a
 * static file can never hardcode a future, admin-created site's id.
 *
 * There used to be PENDING_FOR_ME/OPEN_EXCEPTIONS_COUNT/UNACCOUNTED_DEVICES_COUNT mock
 * constants here standing in for the transactions/exceptions ledger. They were fake
 * numbers shown as if real on every page — removed; every caller now uses 0/[] directly
 * until the real ledger is wired up, so an empty database shows as empty.
 */

export const META_USERS: CurrentUser[] = [
  { id: "user-l1", name: "IT", level: "L1", siteId: null, scopedSiteIds: [] },
  { id: "user-l3", name: "Ops Supervisor", level: "L3", siteId: null, scopedSiteIds: [] },
  { id: "user-l4", name: "Management", level: "L4", siteId: null, scopedSiteIds: [] },
];

export const DEFAULT_USER_ID = "user-l1";
