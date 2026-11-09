# FLS Relay — project structure and handoff

Updated: 2026-11-06. Documentation snapshot based on `main` at `0c1f931`.
This describes implemented behavior and outstanding work; it is not a claim that the full requirements are complete.

## Start here

1. Read [AGENTS.md](AGENTS.md), including the installed Next.js documentation requirement before changing application code.
2. Open [InventoryWorkspace.tsx](components/inventory/InventoryWorkspace.tsx). This is the current main application.
3. Read [workflow requirements](docs/workflow-requirements.md), [inventory testing](docs/inventory-testing.md), and [site/people plan](docs/site-people-plan.md).
4. Use the latest user decisions below when older specifications conflict. The original root specifications describe a broader, older design.

Production project: `fls-relay`, https://fls-relay.vercel.app/preview.
Git repository: https://github.com/Narongyot1990/fls-relay.
Deployment status and live database contents must be checked separately when needed; neither is fixed by this document.

## Runtime and entry points

- Next.js 16.4.0 App Router, React 19.3.0, TypeScript, Tailwind CSS 4.
- MongoDB official driver; ExcelJS for XLSX; Base UI/shadcn wrappers; Playwright using Microsoft Edge.
- `app/layout.tsx` installs the shared language provider. English is the default.
- `proxy.ts` redirects `/` to `/preview`.
- `app/preview/page.tsx` -> `components/preview/PhonePreview.tsx` -> `InventoryWorkspace.tsx`.
- The word "preview" is historical: this workspace reads and writes real inventory data.
- There is no root `app/page.tsx`. The older home is `app/(app)/page.tsx`; root requests are redirected.
- `/workflow` reviews the role/action structure. `/login` only redirects to `/preview`.

## Directory map

```text
app/
  layout.tsx, globals.css       Shared layout, fonts and styles
  preview/page.tsx              Current application entry
  workflow/page.tsx             Bilingual workflow/role review
  login/page.tsx                Redirect, not authentication
  (app)/                       Legacy routes and layout (see below)
  api/
    inventory/                 Current workspace API
      route.ts                 GET scoped data/context
      [id]/route.ts            PATCH / DELETE by MongoDB _id
      sites/route.ts           POST site
      people/route.ts          POST driver or Site Leader
      import/preview/route.ts  POST read-only file validation
      import/route.ts          POST confirmed import
    devices/                   Legacy IMEI-based device/custody API
    sites/, holders/, models/  Legacy directory/model APIs
    blob/view/route.ts         Legacy evidence retrieval
components/
  inventory/
    InventoryWorkspace.tsx     Role, scope, navigation, fetch and CRUD orchestration
    RoleHome.tsx               Task cards and role landing content
    InventoryImport.tsx        File selection, mapping, preview and confirmed import
    DirectoryPanel.tsx         Site/people lists, search and creation
    DeleteDeviceDialog.tsx     Portal confirmation with busy/error states
    LoadingIcon.tsx            Shared operation spinner
    HandoverReview.tsx         Driver selection and handover review; no persistence
    AgreementTerms.tsx         Full bilingual terms and accessories
  preview/
    PhonePreview.tsx           Thin current-workspace wrapper
    PreviewSignature.tsx       Temporary touch/canvas signature
  shared/
    LanguageProvider.tsx       Shared EN/TH selection
  ui/                         Base UI/shadcn components
  device/, transaction/, layout/  Primarily legacy UI
lib/
  inventory.ts                Current inventory types, validation and import limits
  inventory-file.ts           XLSX/CSV reading and column mapping
  inventory-csv.ts            Current quoted CSV parser
  inventory-access.ts         Public testing role/scope checks and write-origin checks
  directory.ts                Site/people types, validation and management rules
  workflow-structure.ts       Planned roles/actions, independent of legacy levels
  ui-language.ts              UI translation dictionary
  policies/smartphone-handover.json  Canonical full EN/TH agreement
  db/
    mongodb.ts                Lazy MongoClient, MONGODB_URI
    inventory.ts              Current persistence mapping and import/index helpers
    queries.ts                Legacy queries and direct snapshot mutations
    documents.ts, mappers.ts   Legacy BSON types and conversion
  permissions.ts              Legacy L1-L4 model, not current workflow roles
  current-user.tsx             Legacy localStorage role context
  mock-data.ts                Legacy test identities; do not seed product records
  api-client.ts, csv.ts        Legacy client and CSV parser
types/index.ts                Legacy domain types; current types also live in lib/inventory.ts
docs/                         Requirements, testing and directory implementation plan
scripts/                      Validation tools and legacy seed script
tests/browser/inventory.spec.ts  Browser regression tests with mocked API traffic
proxy.ts                      Root redirect
playwright.config.ts          Edge, mobile viewport, base URL override
AGENTS.md                     Repository agent instructions
CLAUDE.md                     Claude entry instructions
```

### Legacy routes are still present

`app/(app)` includes `/devices`, `/devices/new`, `/devices/[imei]` and its edit/assign/unassign/MDM pages; `/hand-out`, `/take-back`; and `/admin` sites, holders and models pages.
`/stock-count`, `/inbox`, `/export` and `/approvals` are placeholders. `/devices/import` redirects to `/preview`; the legacy device-import API is disabled with HTTP 410.

Do not confuse legacy IMEI identifiers, L1-L4 permissions or direct custody updates with the new inventory flow. Imported devices may have no IMEI. Prefer the current inventory endpoints and stable MongoDB `_id` for new work.

## Current API and data flow

| Endpoint | Behavior | Writes database? |
| --- | --- | --- |
| `GET /api/inventory?site=all\|central\|<id>` | Scoped devices, sites, holders, leaders and assigned site | No |
| `PATCH /api/inventory/<id>` | Edit inventory identity/details with validation | Yes |
| `DELETE /api/inventory/<id>` | Delete only eligible unused central stock | Yes |
| `POST /api/inventory/import/preview` | Parse, map, validate and check existing IDs | No |
| `POST /api/inventory/import` | Explicit `confirm: true`; insert valid records, skip existing | Yes |
| `POST /api/inventory/sites` | Create active site with unique uppercase code | Yes |
| `POST /api/inventory/people` | Create active driver/Site Leader at an active site | Yes |
| `POST /api/inventory/transfer` | Central-stock devices -> a site, status `in_transit` | Yes |
| `POST /api/inventory/receipt` | Site Leader confirms `in_transit` devices into `in_site_stock` | Yes |
| `POST /api/inventory/issue` | Assign an eligible device to a driver; persists signature/accessories | Yes |
| `POST /api/inventory/return` | Close an assignment; `condition: ok` or `damaged` | Yes |
| `POST /api/inventory/exchange` | One driver: return + issue, linked by `replacementRef` | Yes |
| `GET /api/inventory/history` | Scoped `custody_transactions` ledger with resolved device/holder/site names | No |

The workspace sends `X-Inventory-Role`; Site Leader mode also sends `X-Inventory-Leader`. The server resolves that active holder's assigned site rather than trusting a client-supplied affiliation. Production writes check the request Origin. These checks support public testing and do not authenticate a person.

Inventory writes/import are for IT and Implementation. Site/people creation is for IT and System Admin. Other views are scoped by role. Review the route and `inventory-access.ts` before extending permissions.

### MongoDB concepts

- `devices`: device identity, optional IMEI/serial/model/phone, MDM reference, current status/site/holder and last activity.
- `sites`: code, name and active flag.
- `holders`: driver or Site Leader, FLS employee number, name, required site, optional phone and active flag.
- `models` and `transactions`: legacy collections; their existence does not mean the new immutable custody ledger is implemented.
- `custody_transactions`: the new ledger (`lib/db/transactions.ts`). Not append-only/correction-guarded yet — a real limitation, not a naming coincidence with the legacy `transactions` collection, which this deliberately does not reuse.
- Device `status` now also includes `in_transit` (transferred, awaiting Site Leader receipt) and `damaged` (returned damaged; not reissuable).
- `currentSiteId: null` means **Central stock / No site assigned**, not a site named Central.
- New imports start `registered`, with no site/holder. MDM ownership or Primary user UPN must not become custody or driver identity automatically.
- Normalized `deviceIdKey` uniqueness and partial optional IMEI/serial indexes are prepared on explicit writes. GET and import preview must stay read-only.
- Device ID cannot change after custody activity. Delete requires `registered`, no site, no holder and no last activity.

Import supports CSV/XLSX up to 5 MB / 2,000 rows. Preview and commit both validate. All occurrences of duplicate IDs within a file are invalid, case-insensitively; existing database records are skipped, not overwritten. Never fabricate IMEI/serial placeholders.

## User decisions to preserve

### Roles and sites

- Central roles: IT, Implementation and System Admin. They have no site affiliation and can view all sites or select one site.
- Site Leaders and drivers belong to sites. Site Leaders see only their own site's records.
- Drivers are holders/signers, not separate login accounts in the current design.
- Role switching is intentional so testers can review multiple workflows.
- **Authentication was explicitly removed by the user for public Production testing.** Do not add a password/session gate without a new request. Role selection is not a security boundary.

### Data and interface

- Real database records only. Do not seed, automatically import the supplied spreadsheet, invent counters or show fake successful writes.
- Preserve the reviewed UI inspired by sibling `yard-management`: slate background, white header, blue primary actions, colored task cards and mobile-first forms.
- Shared EN/TH switch, default EN. Keep actual names/site values unchanged.
- Keep loading feedback and duplicate-submit prevention for fetch/save/delete/import/site/people operations.
- Delete confirmation is a portal dialog so it opens immediately even below a long list. Keep errors and busy state inside the dialog.
- Site/people currently support add, read and search. Do not imply edit/deactivation/staff import are already implemented.
- Site codes are unique uppercase 2-24 characters. People require a unique FLS employee number (string, preserve leading zeros), name and an existing active site.

### Required driver handover

```text
Site Leader selects driver -> selects phone -> Hand over
-> driver reads full terms on the phone -> scrolls to signature
-> acknowledges and signs -> Submit completes the handover
```

No extra Site Leader confirmation after the driver's Submit.

**Current implementation is review-only:** `HandoverReview.tsx` does not persist custody, signatures or PDFs, and Submit is disabled. The signature exists only in memory. Do not enable success without implementing persistence and evidence.

The agreement JSON contains the full supplied bilingual DOCX terms, eight sections and five accessories. Language/accessory changes reset signature/consent. Preserve the complete policy, not a shortened replacement.

## Completed versus pending

| Area | Current state |
| --- | --- |
| Role/site filters and inventory | Real database-backed |
| CSV/XLSX import preview and confirmed import | Implemented |
| Inventory editing and restricted deletion | Implemented |
| Site/people registration and lookup | Implemented |
| Loading states and portal delete confirmation | Implemented with browser regression coverage |
| Bilingual agreement and touch signature | Persisted on Submit: assignment, signature image and accessory checklist write to `custody_transactions`. No PDF yet. |
| Batch transfers / recipient receipt | Implemented: central stock -> `in_transit` -> Site Leader confirms -> `in_site_stock`. Central-stock source only; site-to-site transfer still deferred. |
| Driver issue / returns / exchange | Implemented: `/api/inventory/issue`, `/return`, `/exchange`. Return tags condition `ok`/`damaged`; a damaged device does not return to issuable stock. Exchange links a return + issue via `replacementRef`, written as two rows (no DB session — best-effort revert on partial failure, not a real transaction). |
| Immutable ledger, PDF/evidence, searchable documents | New `custody_transactions` collection (not the legacy `transactions` collection) backs a real History screen, scoped like every other screen. Rows are not actually append-only/correction-guarded yet, and there is still no PDF or evidence storage. |
| Stock count, approvals and reporting | Incomplete/placeholders |
| Real authentication | Deliberately absent for current testing |

Legacy hand-out/take-back endpoints mutate snapshots/last activity; they are not a complete audited implementation of the PDF workflow.

## Requirement sources

Latest user clarifications take precedence over older documents. Local source files are outside this repository and may not exist on another machine:

- `D:\projects\webApp\Driver_Phone_Issuing__Return_Process.pdf`: operational process baseline.
- `D:\projects\webApp\Professional_Smartphone_Handover_Bilingual_EN_TH.docx`: exact signing policy, represented by the tracked policy JSON.
- `D:\projects\webApp\TRN_Mobile_Inventory_12102026.xlsx`: user-controlled import source; **do not import automatically**. It contains Intune fields without IMEI/serial/model/phone; users must review the selected Device ID mapping.
- `D:\projects\webApp\yard-management`: UI reference only.

Root [management spec](phone-asset-management-spec.md) and [frontend spec](phone-asset-frontend-spec.md) are historical references. They are not proof that described features exist.

## Run and verify

Requires Node/npm, dependencies and an appropriately configured `.env.local` containing `MONGODB_URI`. Never print or commit its value. Development may point to the same real database as Production; do not assume isolation.

```powershell
npm install
npm run dev
# Open http://localhost:3000/preview

npm run lint
npm run build
npm run test:inventory
npm run test:ui
```

The user currently reviews changes on Production. Browser tests can target the deployed UI:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'https://fls-relay.vercel.app'
npm run test:ui
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

Browser tests intercept `/api/**` with fixtures; they test UI without inserting or deleting live records. Preserve this interception. Inventory unit tests also use fake persistence. These do not prove real write integration or complete custody functionality.

Additional tools:

- `node scripts/verify-ui-language.mjs`: dictionary/default-English checks; requires local server for HTTP checks.
- `python scripts/verify-handover-policy.py "<source.docx>"`: source hash and exact bilingual policy verification.
- `python scripts/extract-handover-policy.py "<source.docx>"`: regenerate policy JSON; does not edit the DOCX.
- `node --env-file=.env.local scripts/verify-inventory-readonly.mjs "<source.xlsx>"`: database/index fingerprint before/after read-only import preview.
- `scripts/seed.mjs` is legacy. **Do not run it as setup.**

Run checks appropriate to actual changes. Do not add live production records just to test. Build may require network for Google fonts. The installed Next.js version has emitted an upgrade/security reminder; a successful build does not resolve that dependency issue. Treat an upgrade as separate, reviewable work.

## Deployment and private files

- GitHub `main` is linked to Vercel project `fls-relay` for automatic deployment. Check Git status before pushing and inspect Vercel deployment status before claiming deployment success.
- `.env.local`, `.vercel/`, `.local-backups/`, `.next/`, logs and test reports are local/ignored artifacts.
- `.local-backups/` can contain real data backups and obsolete testing credentials. Never print, commit or restore them automatically. The old production test password is no longer part of authentication.
- Do not reset collections, run seeds, import files, change production environment variables or restore backups as an incidental setup step.

## Suggested continuation

Choose the next feature with the user; these are outstanding areas, not automatic authorization to perform every item:

1. Generate and store the signed agreement PDF; the signature/accessories/policy version are persisted as data on the transaction now, not as a document.
2. Make `custody_transactions` genuinely append-only with correction records, and move multi-step writes (exchange, batch transfer) onto real MongoDB sessions instead of best-effort sequential updates.
3. Site-to-site transfer, write-off/retire/lost, stock counts and exceptions remain unimplemented.
4. Add directory edit/deactivation with reference/history checks, then reporting/export.

Keep the reviewed interface while replacing review-only actions with real behavior. Never substitute mock success for unfinished backend work.
