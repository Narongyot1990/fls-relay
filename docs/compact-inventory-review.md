# Compact inventory controls

The previous layout repeated site scope in the header and a large site grid, status selection in summary cards and a dropdown, and record counts in multiple places. Separate Back, heading, help text, sort and view rows pushed the first phone below the mobile viewport.

The inventory now uses one combined toolbar:

1. Back, short page title, Add, icon-only Card / Table switch. Show a matching count only when the result is filtered, avoiding a repeated total.
2. Search and sort.
3. Current site and status with Total / In stock / Assigned counts.

These become one row at desktop widths. The workspace header omits its second scope row while this toolbar is visible. The same site selector moves into the toolbar; it retains site search, central stock, all sites, server-resolved Site Leader scope and pending-state restrictions. The site dialog shows counts for the selected status. Site tracking retains the detailed comparison dashboard.

InventoryList renders records only, using the sort and view state supplied by its workspace. Removed its duplicate record count, instructions, separate sort and view rows. Query, status, permissions, assignments and database behavior are preserved. Add/import/edit screens retain their existing scope and forms.

Browser validation measures the toolbar at 320 / 390 / 768 / 1366 px, checks three mobile rows / one desktop row, verifies the first phone starts above 330 px, and tests Thai labels, search, site selection, counts, status, sorting, view preferences, permissions and existing actions. API traffic is mocked, with no live assignment changes.

Validation: 51 browser scenarios passed in the full run; one Thai scenario still used the removed summary-card button. Its selector was updated for the combined status dropdown and passed on rerun, together with the final compact-layout checks. TypeScript, ESLint, UI-language verification and production build passed. The build succeeded on retry with the existing Next.js security advisory warning; dependencies were unchanged.

- [Mobile review](review/compact-inventory-mobile.png)
- [Desktop review](review/compact-inventory-desktop.png)

Not deployed.
