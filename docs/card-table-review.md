# Card / table views — 12 November 2026

Site tracking now also supports Card/Table, and Create uses the compact toolbar. See [the latest review](compact-site-create-review.md) for both layouts.

The Devices toolbar was subsequently combined into three mobile rows / one desktop row. See [compact inventory review](compact-inventory-review.md) for the current layout and screenshots.

## Problem and design

Large cards make it hard to compare many phones or drivers. Keep the detailed card layout and add a table using the exact same filtered, sorted records and selection state.

The switch is available in Devices, Create → People / Sites, driver selection in Issue / Return / Exchange, and phone selection in Issue / Exchange. Site tracking remains a summary dashboard; History retains its transaction timeline. Transfer and receipt retain their existing compact checkbox lists.

| List | Table overview | Expand row |
| --- | --- | --- |
| Phones | Model + Device ID, status, site, holder + employee ID, phone number | Technical / MDM details, last update, issued accessories, History and permitted Edit / Delete actions |
| People | Name + employee ID, role, site, contact, active status | Full identity/contact and existing management actions |
| Sites | Name + code, active status | Site inventory and existing management actions |
| Driver selector | Name + employee ID, assignment status/count, assigned phones | Phone details popup; opening details does not select the driver |
| Phone selector | Model + Device ID, site, number, selection | Technical identity details |

Below 768 px, retain identity and status/selection columns. Show site and holder/role as secondary lines under identity, and expose the other fields in row details. Avoid horizontal page scrolling and preserve native table semantics. Expand controls and view switches have accessible names, keyboard operation and at least 44 px touch targets. Long identifiers and names wrap.

Card is the initial default. Preferences are stored in this browser separately for inventory, people, sites, driver selection and phone selection; Issue and Exchange share phone-choice preference. Filters, sort, selected driver/phone, site grouping and action permissions remain owned by their original components. Switching view never submits a transaction. Only the active layout is rendered.

## Implementation

- `ListViewToggle.tsx`: EN/TH switch and browser preference subscription with SSR-safe default and storage-unavailable fallback.
- `ResponsiveRecordTable.tsx`: semantic table, responsive columns, stable record-keyed expansion, named expand buttons and optional selected-row styling.
- `PhoneChoiceList.tsx`: shared table presentation for Issue / Exchange, using their original selection callbacks.
- Inventory and directory actions are shared between layouts to preserve the existing permission and pending-state checks.
- The Devices search input occupies its own row on small screens so it remains usable alongside status and Add controls.

## Validation and review

Browser tests intercept all API calls. New test fixtures block writes and contain synthetic QA identities. Tests cover switching with filters/sort/grouping, stored preferences after reload, directory actions, driver/phone selection, Return and Exchange progression, guarded signing, Thai labels, empty results, and widths 320 / 390 / 768 / 1366 px. These tests do not prove real database writes.

The full 51-test browser suite passed. The seven table-view scenarios passed again after final responsive refinements, including expanded-row column spans when resizing and expand-button alignment. TypeScript, ESLint, the 171-entry UI language check and production build passed. The build succeeded on retry with the existing Next.js security advisory warning; a dependency security update remains separate work.

Review images after validation:

- [Phones, desktop](review/inventory-table-desktop.png)
- [Phones, mobile](review/inventory-table-mobile.png)
- [People, desktop](review/people-table-desktop.png)
- [People, mobile](review/people-table-mobile.png)

No database migration, assignment change, commit or deployment is part of this change. Existing local role/menu/step-flow edits are preserved.
