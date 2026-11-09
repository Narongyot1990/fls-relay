# Accessory reconciliation and FLS visual review

9 November 2026. Continues the existing lifecycle changes without modifying the
supplied agreement text or writing test data into MongoDB.

## Review

The issue endpoint already saved the five accessory selections, but the inventory
and history read models omitted them. Return and Exchange had no reconciliation
against that original checklist.

The current driver popup now shows the accessories from the original issue.
Expanded history shows the issued kit, returned/missing status and discrepancy
notes. Inventory reads recover existing selections from the latest persisted issue
for the phone's current holder, including issues created before this change.
Missing historical data is explicitly unknown; an empty recorded list means no
accessories were issued. These cases are not conflated.

For Return/Recall and the return half of Exchange:

1. Display only accessories on the selected phone's original issue.
2. The operator checks each item physically received, then confirms the checklist
   was reviewed. Nothing is preselected as returned.
3. Any unticked issued accessory is missing and requires an explanation.
4. The API verifies the assignment reference and derives the expected kit from
   stored history. Posted values cannot invent supplied items or bypass missing
   notes. The original kit, received kit, missing kit and notes are saved with the
   return transaction.
5. Exchange captures the replacement's new kit separately in the driver's signed
   acknowledgement. Old and new accessory sets are not copied over automatically.

Phone condition remains separate from accessory completeness. A missing cable is
documented without silently marking the phone damaged. Accessory labels keep their
stable IDs 0–4 from the supplied policy; do not reorder those entries in future
policy revisions.

The 25 generated blue/green icons replace pictograms across the active workflow.
The compact header uses the original globe symbol and a short company name.
See [visual assets and exact prompt](./fls-visual-assets.md).

## Review previews

Browser screenshots use synthetic QA records only, not company staff or inventory.

- [Mobile Home](./review/fls-home-mobile.png)
- [Desktop Home](./review/fls-home-desktop.png)
- [Partial accessory return](./review/accessory-return-mobile.png)
- [Accessory transaction history](./review/accessory-history-mobile.png)

## Next steps

1. UAT with a Site Leader: issue a phone with charger/cable, return both; repeat
   with one missing; exchange while issuing a different accessory kit. Check the
   driver popup and history after each operation.
2. Generate and retrieve handover/return PDFs containing both accessory evidence
   and signer identity. PDF generation is still not implemented.
3. Add an outstanding-accessories report and a follow-up receipt action so late
   accessory returns can close the discrepancy without rewriting the original
   return transaction. Current records retain the initial discrepancy permanently;
   a later accessory-only receipt is not yet available.
4. Before production rollout, review authenticated roles and document access with
   FLS IT and address the installed Next.js security upgrade warning. The current
   public role switcher remains the previously requested testing mode.

No deployment or production inventory mutation is performed for this review.

## Validation

- 31 inventory/API tests passed, using in-memory database fakes. These include
  original accessory recovery, stale assignment rejection, tampered accessory
  rejection, required discrepancy notes and independent old/new Exchange kits.
- 26 browser tests passed against intercepted APIs, including the previous
  lifecycle tests plus six new accessory/branding scenarios.
- ESLint and TypeScript checks passed. The production build compiles and renders
  routes; the installed Next.js version also emits a security upgrade reminder.
- Live inventory GET was checked read-only and returned HTTP 200. Write paths
  were not exercised against company records.
