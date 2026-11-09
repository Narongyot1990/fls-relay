# Workflow baseline and user structure

**9 November 2026 update:** The new lifecycle UI and APIs now support driver
assignment indicators, inventory status filters, returns/recalls with reasons,
signed exchanges, explicit driver signer snapshots and grouped transaction history.
See [lifecycle-updates.md](./lifecycle-updates.md). Older preview-only and disabled
Submit descriptions below are historical. Handover PDF generation and authenticated
accounts remain outside this implementation.

**Current implementation:** `/preview` reads real MongoDB data while retaining the reviewed role-specific colored card Home and handover UI. The new interface defaults to EN and supports a shared EN/TH switch. Sample devices/sites/drivers and simulated success remain removed. The handover review uses real records or an explicitly blank form and all eight bilingual sections of the supplied `Professional_Smartphone_Handover_Bilingual_EN_TH.docx`, including accessories and its acknowledgement wording. Signatures remain temporary on screen; Submit remains disabled. Inventory/Import/CRUD continue through the existing live APIs. Historical UI-preview descriptions below document earlier iterations. See [inventory-testing.md](./inventory-testing.md) for the current import/CRUD workflow and verification limits. No user inventory file has been committed to the database by the agent.

Source: `D:\projects\webApp\Driver_Phone_Issuing__Return_Process.pdf`, 5 pages, document dated 5 October 2026. Reviewed 5 November 2026.

This is the proposed starting structure, not a completed backend or approved access policy. The PDF takes precedence where it conflicts with the older repository specifications. Existing working-tree edits are preserved. Review the interactive menu at `/workflow`; it does not connect to legacy write endpoints or require MongoDB.

## Confirmed site-access clarification

The user's subsequent clarification supersedes earlier proposed site assignments and role-isolated demo data below:

- Only Site Leaders and drivers have an assigned site. Site Leaders see devices, drivers and transactions at their own assigned site only. Drivers participate in their own assisted receipt, not a site inventory dashboard.
- IT, Implementation and System Admin are central users without site affiliation. They can view all sites together or filter a particular site. Viewing all sites does not grant additional operational permissions.
- `/preview` now uses one shared in-memory inventory across role switches. Central users have an All Sites / Rayong / Chonburi / Central Stock filter, scope-based totals and a clickable per-site overview. Site Leaders are locked to sample Rayong with no site selector. Inventory, driver search, eligible phone selection and receipt history use the selected scope.
- Central Stock is unallocated inventory, not a central user's home site. An issue from central stock records the driver's site; the preview moves the device into that site. Phones from a different site are not eligible for direct issue to the selected driver.
- Switching role or changing the site filter clears unfinished handover drafts. Submitted sample changes remain shared until refresh. This prototype does not replace authentication or enforce access in legacy production API routes; those remain a separate implementation step.

## 1. Roles, people and access

PDF pp. 1–3 explicitly names IT, Implementation Team, Site Leader and Driver. It does not define Supervisor or Management permissions. Do not automatically map these into legacy L1–L4 or inherit the old unrestricted empty-site scope.

| Role | Responsibility | Proposed buttons | Access boundary |
| --- | --- | --- | --- |
| IT | Technical owner; provides inventory/export; technical issues | Dashboard, Receive Devices, Inventory, Review Device Information, History/Documents | Granted inventory/technical scope. Import/edit authority still requires confirmation, PDF p. 5. No handover authority unless also assigned an operational role. |
| Implementation | Receives/imports inventory; rollout; direct issue or transfer to Site Leaders | Dashboard, Receive Devices, Inventory, Transfer to Site Leader, Issue to Driver, Return, Exchange, History/Documents | Assigned sites and stock under its custody. Return/exchange permissions are a proposal consistent with lifecycle operation, not an explicit PDF role grant. |
| Site Leader | Receives stock; issues, takes returns and exchanges; captures acknowledgement | Dashboard, Confirm Receipt, Inventory, Issue to Driver, Return, Exchange, History/Documents | Assigned site(s), eligible stock under custody, and relevant assignments/documents. No import or cross-site transfer by default. |
| Driver | Reads policy and acknowledges receipt | Read Policy, Change Policy Language, Acknowledge; operator then confirms | Proposed assisted flow on operator's device. No operator account or inventory menu required for MVP. Personal document delivery/access method remains open. |
| System Admin (proposal) | Access and reference-data administration | Users and Access, Sites and People | Separate administrative capability. No automatic handover or unrestricted PDF access. Not a PDF-defined operational role. |

Keep users distinct from people/holders: a Site Leader links an authenticated operator account to a staff identity; a driver is a person with FLS Employee ID. Use one maintained staff identity when someone has multiple responsibilities. Recipients must be separate Site Leader and Driver selectors.

Proposed account: stable id, identity-provider subject (when auth is selected), employeeId, displayName, active, roles[], explicit scope (`sites` with siteIds, or explicit `all_sites`), administrative capability. Empty site arrays grant no access. Multiple operational roles are allowed explicitly; verify scope and action on the server for each request. Do not treat the preview selector as login.

Legacy Supervisor/Management: retained in the existing app pending a business decision. They are not granted roles in the new baseline. Assigning system administrator authority is also pending; do not equate it with Management automatically.

## 2. Process and button behavior

| Action | Owner | Required result |
| --- | --- | --- |
| Receive Devices | Implementation; IT permission proposed | Excel/CSV column mapping and review, or manual add, into one inventory. Unique Device ID; conflicts reviewed, never silently duplicated/overwritten. |
| Transfer to Site Leader | Implementation | Select site, distinct Site Leader and one/many available devices. Batch reference plus per-device history. No driver policy. |
| Record Transfer Directly | Issuer | Update custody and history, labeled issuer-recorded. Never claim recipient confirmation. |
| Request Receipt Confirmation | Issuer, then named recipient | Pending until recipient accepts; preserve sender custody while pending and reserve stock to prevent another issue (reservation behavior is proposed). Confirmation applies custody once. Cancellation/rejection rules require definition. |
| Issue to Driver | Implementation or Site Leader | Search name/FLS ID, select eligible stock, present complete approved Thai/English policy, capture approved acknowledgement, operator confirms, store linked PDF and assignment. |
| Return | Site Leader; Implementation proposed | Select active assignment, record condition, close assignment, record receiving custody, route damaged/uncertain stock to inspection. |
| Exchange | Site Leader; Implementation proposed | One linked operation returning old and issuing replacement, with required acknowledgement. No overlapping active assignment for either device; no partially completed exchange. |
| History / Documents | Authorized operator | Immutable transactions and protected document retrieval by device, driver, site, batch and date. |
| Review Device Information | IT proposed | Controlled metadata conflict review; inspection clearance needs an explicitly authorized actor and audit entry. |

Policy text, consent method and versioning need HR/IT approval (PDF pp. 3–5). A boolean `signed` or `evidenceAttached` is not persisted acknowledgement. Prevent a successful issue without stored, retrievable evidence/PDF; define retry/failure handling before implementation. Never invent approved policy wording.

## 3. Data foundations before rebuilding flows

- Stable internal device id plus unique operational Device ID. Confirm whether the export's Device ID means Intune id, device name or a company asset identifier. IMEI and serial are optional; no fake IMEI required for imports. Existing IMEI routes require a migration plan.
- Separate custody (who controls stock), site, active driver assignment, physical/technical condition, and lifecycle state. A returned damaged phone is not eligible stock. “Returned” describes an event, not sufficient permission to issue again.
- Keep assignments separately from immutable transactions. Store actor identity, from/to custody, device references, timestamps, condition, remarks, batch/exchange references and confirmation method/status.
- Preserve all device history, not only `lastActivity`. Device snapshots may accelerate reads but must agree with committed events.
- Enforce one active assignment per device using a database constraint and conditional atomic writes. Exchange must commit its linked changes consistently. One active assignment per driver is not specified; do not impose it without a decision.
- Store acknowledgement language, approved policy version/full text reference, evidence, operator, timestamp, transaction reference and protected PDF location. Authorize every download.
- Intune import is manual, not live synchronization. Keep metadata conflict review separate from custody updates.

## 4. Existing pages: keep, rebuild or defer

Do not delete code or records merely to simplify navigation. First establish the new role/action structure, then replace visible entry points and disable obsolete write routes as each replacement is ready. These are planned dispositions, not cleanup already performed.

| Existing area | Disposition | Reason |
| --- | --- | --- |
| Home and navigation | Rebuild after role review | Menus driven by operational permissions; remove zero placeholder summary counts. |
| Devices list/detail | Keep useful components, rebuild data contract | Device ID, separate custody/assignment/condition and full history. |
| Manual registration / import | Rebuild flow, reuse parsing where suitable | Excel and CSV, explicit identifier mapping and controlled updates. |
| Assign/unassign site | Replace | Needs named Site Leader custody, batches and two confirmation modes. Generic unassign cannot replace an audited return/transfer. |
| Hand-out / take-back | Rebuild flow, reuse suitable pickers | Direct issue from Implementation custody, real policy/evidence/PDF, safe damaged returns. |
| Swap | Reintroduce as Exchange | Required by PDF; deletion already exists in working tree and has not been reverted. |
| Inbox | Replace with targeted receipt confirmations | Only requested recipient confirmations belong here; direct transfers do not. |
| Approvals / stock count / standalone export | Defer from initial navigation | Not part of core required screens. Backup/export capability remains required; removing a placeholder page does not remove that requirement. |
| Admin sites/people | Retain and align with account/identity model | Needed reference data; user administration must be distinct from holder records. |
| Model templates/photos and MDM details | Retain existing code, secondary priority | Technical/reference features must not delay core lifecycle. No automatic Intune integration. |
| Delete / retire device actions | Exclude from proposed core menu | Preserve history; retirement authority/process is not defined in this PDF. |

## 5. Delivery sequence and acceptance

### UI preview and clarified issue sequence

The user clarified the Site Leader issue sequence after this baseline: select driver → select phone → press Hand Over → present full policy to driver → driver scrolls to signature → driver signs on the phone → Submit completes the handover. There is no second Site Leader confirmation after Submit. The operator's Hand Over action precedes the driver's review; backend finalization and authorization still need to be designed securely.

`/preview` implements this interaction with sample data, Thai/English switching, driver search, eligible-device selection, touch signature capture and a sample success/inventory/history view. It adopts the existing local `yard-management` visual template: white header, light slate background, blue primary controls, colored icon cards and responsive spacing. Sample policy copy is visibly unapproved, Submit changes browser memory only, refresh resets the preview, and no official PDF is generated. Return/exchange screens and other roles' full UIs remain future work. This is not an authentication or production handover implementation.

### Implementation sequence

The UI preview now includes a role switcher for Site Leader, Implementation, IT and System Admin. Menus use `WORKFLOW_ROLES` rather than the legacy L1–L4 model. Changing role returns to Home and clears unfinished drafts; submitted sample state stays separate per role until refresh. Site Leader issues from sample Rayong stock, Implementation issues directly from sample central stock, and IT/Admin have no issue entry point. Receive, transfer, confirmation, technical review, return/exchange and administration currently show explicitly labeled screen outlines. The switcher is a review aid, not authentication or production access enforcement. Driver remains the assisted policy/signature step rather than a separate account in this preview.

1. Review this role/action structure and scope boundaries. `/workflow` is an interactive structural preview only, with no database writes.
2. Replace legacy role semantics with authenticated accounts and server permissions; agree identifier/import mapping and migration preserving existing records.
3. Agree simple per-section mobile/desktop flows and bilingual labels before detailed visual design.
4. Build inventory, batch transfers and optional receipt confirmation; then policy-backed issue with persisted PDF, return/inspection and linked exchange.
5. Add searchable history/documents and basic dashboard totals from actual records; implement protected access, backup/export and operating notes.
6. Demonstrate PDF p. 4 acceptance scenarios: import 15 unique devices, batch transfer 5, distinguish direct/pending transfer, direct and site issue, bilingual acknowledgement/PDF, damaged return blocked, linked exchange, duplicate/double-assignment protection, accurate totals and usable mobile/desktop flows.

Open inputs (PDF p. 5): approved policy and acknowledgement method; real export/Device ID format; staff/site sources; IT/import authority; identity provider, hosting, document storage/retention; cross-site returns and transfer authorization. Additional proposed decisions: System Admin ownership, technical-clearance authority, pending transfer reservations/cancellation and legacy Supervisor/Management scope.
