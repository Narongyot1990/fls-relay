# Site tracking review

Implemented locally on 2026-11-09. No database assignments or transaction history were changed. Not deployed.

## Try it

1. Open **Site tracking** from the role menu. Compare each site's total phones, assigned phones, ready stock, and distinct active drivers holding phones.
2. Select a site to focus the dashboard. Click **Assigned**, **Stock**, or **Total** on its card to open the corresponding phone list, including current holders.
3. Open **Site history** to view that site's transactions.
4. In **Devices → Assigned**, the all-sites list now groups phones under site headings. Visible site buttons filter the list while preserving Assigned status; **All sites** restores the combined list.

Central stock has its own card and is excluded from individual site totals. Driver coverage counts distinct active drivers at the phone's current site; it does not infer a phone's location from the driver's directory entry. Site Leaders receive only their own site's summaries from the API. Refresh counts reloads the current scope.

## Review images

Screenshots use synthetic QA identities, not real driver details.

- [Dashboard, desktop](review/site-tracking-desktop.png)
- [Dashboard, mobile](review/site-tracking-mobile.png)
- [Assigned grouped by site, desktop](review/assigned-by-site-desktop.png)
- [Assigned grouped by site, mobile](review/assigned-by-site-mobile.png)

## Validation

- Read-only local API verification: CPO_CHO has 6 assigned phones and 6/6 drivers holding phones; CPO_MTP has 6 assigned phones and 6/6 drivers holding phones; central stock has 16 phones. Total: 28 phones, 12 assigned.
- 44 inventory/API tests passed, including summary calculations and server-side Site Leader scope checks.
- All 46 browser tests passed, including six new scenarios for site filtering, grouped assignments, scoped history, partial coverage, Thai labels, and Site Leader restrictions. Browser API writes are mocked.
- TypeScript, ESLint, UI language verification, and production build passed. Build retains the existing Next.js security advisory warning; framework dependencies were unchanged.

Next review: try Assigned → CPOCHO / CPOMTP with the real assignments and confirm that the six current holders and site history match operations.
