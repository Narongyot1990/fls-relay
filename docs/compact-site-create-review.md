# Compact Site tracking and Create

Both pages now follow the compact Devices layout: one scope selector, combined controls, icon-only Card/Table switches and short page headings. Existing inventory, directory and transaction APIs are unchanged.

## Site tracking

- Two control rows on mobile / one on desktop: Back, heading, Refresh, view; then scope and Total/Assigned/Stock counts.
- Removed the duplicate site tile filter, large total banner and introductory text. The existing scope dialog retains site search and counts.
- Added a separately remembered Card/Table view. Table presents site totals, assignments, stock and driver coverage; small screens keep key figures visible and expand the remaining detail/actions.
- Cards use smaller spacing and inline count buttons. Central stock stays separate from driver coverage; pending/unavailable counts remain available.
- Count buttons and site history preserve the exact site/status drill-down. Site Leaders remain restricted to their assigned site.

## Create

- Three control rows on mobile / one on desktop: Back, heading, Add, view; search and scope; People/Sites, type and status.
- Removed the duplicate headings, descriptions, total/active/inactive paragraphs and separate view/count row. Counts are combined with the status selector; matching counts appear with the heading when filtered.
- People and Sites retain independent Card/Table preferences. Cards use smaller spacing. Forms and edit/deactivate/reactivate/delete callbacks, guards and inline errors are preserved.
- Added explicit dictionary coverage for the compact controls in Thai; English remains the default.

`ListPageHeading.tsx` shares the heading/actions/view pattern. `SiteInventoryFilters.tsx` was retired because scope selection is provided by `WorkspaceScope` everywhere.

## Review images

Synthetic QA data only.

- [Site tracking, mobile](review/compact-site-tracking-mobile.png)
- [Site tracking, desktop](review/compact-site-tracking-desktop.png)
- [Create People, mobile](review/compact-create-people-mobile.png)
- [Create People, desktop](review/compact-create-people-desktop.png)
- [Create Sites, mobile](review/compact-create-sites-mobile.png)
- [Create Sites, desktop](review/compact-create-sites-desktop.png)

Browser checks measure toolbar height and first-list position at 320, 390, 768 and 1366 px, exercise site/table drill-down, stored preferences, Thai labels, scope restrictions and directory management. All browser API calls are intercepted; synthetic write requests stay in the test fixtures. No real assignments or database records were changed. No deployment is part of this task.

Validation completed: all 54 browser tests passed, along with ESLint, TypeScript, the 183-entry language check and production build. Build succeeded on retry with the existing Next.js security advisory warning; dependencies were unchanged.
