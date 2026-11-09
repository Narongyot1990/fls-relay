# Directory management and tracking redesign

9 November 2026. Applies to the current inventory workflow at `/preview`.

## Where to test

- Choose **IT** or **System Admin**, then **Directory → People / Sites**.
- System Admin also has **Administration**, with direct People, Sites, Devices
  and History shortcuts. This replaces the old Users and access placeholder.
- Direct links: `/preview?manage=sites`, `/preview?manage=people`,
  `/preview?manage=admin`. Legacy `/admin`, `/admin/sites/...` and
  `/admin/holders/...` bookmarks redirect to these screens. Model-library
  routes remain available separately.

Each directory card now has Edit, Deactivate/Reactivate and Delete actions.
Edit opens a populated form. Deactivate/Reactivate opens that same form with the
desired status selected; Save commits the change. Inactive records remain visible
with an Inactive filter and are excluded from active operational selectors.
Delete opens a confirmation dialog, shows pending/error feedback and prevents
duplicate submissions.

## Data rules

The new PATCH/DELETE handlers are `/api/inventory/sites/[id]` and
`/api/inventory/people/[id]`. They enforce the current directory permissions for
IT/System Admin, input validation and identifier uniqueness.

- Site name/code and person name, employee ID, phone, type, site and active status
  are editable. IDs remain stable.
- Deletion checks current device references, people attached to sites, and custody
  history references. Used records must be retained rather than orphaning history.
- Return a person's assigned phones before changing their site/type or deactivating
  them. Name/contact corrections remain possible while they hold a phone.
- A site cannot be deactivated while it has active devices or active people.
- A site with stock must retain an active Site Leader. Assign another leader before
  moving/deactivating the last one.
- Historical records can be deactivated after clearing their current operational
  dependencies. Deactivation preserves all history and accessory evidence.

## Tracking layout

Phone cards separate model/Device ID, colored status, location, current holder,
employee ID, phone number and update time. Technical/MDM fields and accessories
expand separately. Cards form two aligned columns on desktop and one on mobile.
Search also matches holder name/employee ID and site; status and sort controls help
locate assigned, damaged or pending phones. View history filters the server ledger
to that exact phone while retaining site access checks. Show all phones removes
that filter.

History offers **By phone** and **Timeline** views, search and movement-type filters.
Phone summaries use separate sections for identity, last action, From/To parties
and update time. Expanded transactions show an ordered timeline with distinct
party panels, condition, operator role, reason, accessory reconciliation, signer
and reference fields. Times remain Asia/Bangkok. Search/type filters cover loaded
records; Load more history retrieves older entries.

## Preview images

All screenshots contain synthetic QA data, not company inventory or staff.

- [Administration on mobile](./review/administration-mobile.png)
- [Directory cards on mobile](./review/directory-cards-mobile.png)
- [Inventory on desktop](./review/inventory-cards-desktop.png)
- [Inventory on mobile](./review/inventory-cards-mobile.png)
- [Grouped history on mobile](./review/history-timeline-mobile.png)
- [Filtered timeline on desktop](./review/history-timeline-desktop.png)

No real records were edited or deleted during verification. No deployment was
performed. The existing public testing role switcher remains in place.

## Verification

- 37 inventory/API tests and 33 browser tests passed. Writes use in-memory fakes
  or intercepted requests; the browser tests cover the complete previous lifecycle
  suite plus edit, deactivate/reactivate, confirmed deletion, protected references,
  the new Administration page, phone-specific history and legacy redirects.
- TypeScript, ESLint, the EN/TH dictionary check and the production build passed.
  Next.js still emits the existing security upgrade reminder during build.
- Live inventory and history GET requests returned HTTP 200. These checks were
  read-only.
