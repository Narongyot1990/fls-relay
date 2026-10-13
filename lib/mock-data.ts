import type { CurrentUser, PendingItem } from "@/types";

/**
 * What's left here is intentionally still mock:
 * - MOCK_USERS / DEFAULT_USER_ID back the dev-only role switcher (lib/current-user.tsx).
 *   There is no real auth yet, so "who am I" has to come from somewhere. One preview
 *   user exists per site leader (scoped to exactly that site, matching how the real
 *   org works), plus one each for IT/Ops/Management, who are not site-bound —
 *   `scopedSiteIds: []` means "every site", not "no sites" (see sitesInScope()).
 * - PENDING_FOR_ME, OPEN_EXCEPTIONS_COUNT, UNACCOUNTED_DEVICES_COUNT stand in for the
 *   transactions/exceptions ledger, which hasn't been migrated to MongoDB yet.
 *
 * Sites, holders, and devices now live in MongoDB (see lib/db/queries.ts + scripts/seed.mjs).
 * The site ids below match that seed data's ObjectIds — reseeding is idempotent
 * (upserts by natural key), so these stay stable across reseeds.
 */

const RAYONG_SITE_ID = "6acd5d7f0b25a91f253a500c";
const CHONBURI_SITE_ID = "6acd5d7f0b25a91f253a500d";
const LAEM_CHABANG_SITE_ID = "6acd5d7f0b25a91f253a500e";

export const MOCK_USERS: CurrentUser[] = [
  { id: "user-l1", name: "Alex Tanner", level: "L1", siteId: RAYONG_SITE_ID, scopedSiteIds: [] },
  { id: "user-l2-ryg", name: "Somsak Kaewmanee", level: "L2", siteId: RAYONG_SITE_ID, scopedSiteIds: [RAYONG_SITE_ID] },
  { id: "user-l2-cbi", name: "Duangjai Thongdee", level: "L2", siteId: CHONBURI_SITE_ID, scopedSiteIds: [CHONBURI_SITE_ID] },
  { id: "user-l2-lcb", name: "Kittipong Wongsawat", level: "L2", siteId: LAEM_CHABANG_SITE_ID, scopedSiteIds: [LAEM_CHABANG_SITE_ID] },
  { id: "user-l3", name: "Dana Reyes", level: "L3", siteId: RAYONG_SITE_ID, scopedSiteIds: [] },
  { id: "user-l4", name: "Chris Lindqvist", level: "L4", siteId: RAYONG_SITE_ID, scopedSiteIds: [] },
];

export const DEFAULT_USER_ID = "user-l2-ryg";

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
