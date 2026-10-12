# Phone Asset Management System — Build Specification

**Project:** Mobile device custody tracking for FLS Transport
**Stack:** Next.js (App Router, TypeScript) → GitHub → Vercel
**Database:** MongoDB Atlas (via Vercel integration)
**Status:** Specification for implementation

---

## 1. Purpose

Track the full custody chain of company mobile phones issued to drivers — from IT registration, through site leaders, to drivers, and back. Replaces an improvised Excel tracker that cannot retain history.

The system must answer two questions at any time:

1. Where is this device now, and who holds it?
2. Who has held this device before, and when did each handover happen?

---

## 2. Core design principles

1. **Two-layer data model.** A device register holds current state. A transaction ledger holds every event. Device state is *derived* from the ledger — never edited directly.
2. **Append-only ledger.** Transactions are never updated or deleted. An error is fixed by a correction record referencing the original.
3. **Two-sided confirmation.** The sender records the transfer; the receiver confirms it. A transaction stays `pending` until confirmed. Device status changes only on confirmation. This is the key control that prevents one-sided records and untraceable devices.
4. **No free text for identity.** Devices and holders are selected from existing records, never typed. IMEI is never keyed manually after registration.
5. **Evidence attached at the point of handover.** A driver assignment is not valid until the signed Company Handout Form is attached.

---

## 3. Roles and permissions

Four permission levels. Operations Manager and Fulfillment Manager share one level — no separate rules.

| Level | Role | Permissions |
|---|---|---|
| L1 | IT | Register devices, edit device master data (model, serial, phone number). No field handover actions. |
| L2 | Site Leader | Record and confirm handovers, assignments, returns, replacements — own site only. |
| L3 | Operations Supervisor | All L2 actions across assigned sites, plus verify records, transfer between sites, run stock counts. |
| L4 | Management (Ops Manager / Fulfillment Manager) | Approve write-off and loss, view all sites, export reports, administer users and sites. |

**Scoping rule:** L2 sees only its own site. L3 sees its assigned sites. L4 sees everything. Enforced in middleware *and* re-checked in every API route — never trust the client.

**Implementation Team** (rollout only) maps to L3 and is removed after go-live.

**Drivers** are not system users. They appear as holders and sign the physical form.

---

## 4. Device state machine

```
Registered ──T1──► In Site Stock ──T2──► Assigned
     ▲                   │                   │
     │                   │                   │
     └────────T4─────────┴───────T4──────────┘
                         │
                      T3 / T5
                         ▼
                 Retired / Lost
```

Allowed statuses: `registered`, `in_site_stock`, `assigned`, `returned`, `retired`, `lost`

Allowed transitions — anything else must be rejected at the API layer:

| From | Transaction | To |
|---|---|---|
| registered | T1 Issue to Site | in_site_stock |
| registered | T2 Assign to Driver (direct issue) | assigned |
| in_site_stock | T2 Assign to Driver | assigned |
| in_site_stock | T5 Transfer to another site | in_site_stock |
| in_site_stock | T5 Retire | retired |
| assigned | T3 Replacement | returned (outgoing) |
| assigned | T4 Return | returned |
| assigned | T5 Report lost | lost |
| returned | T1 Issue to Site | in_site_stock |
| returned | T5 Retire | retired |

`retired` and `lost` are terminal and require L4 approval.

---

## 5. Transaction types

| Code | Name | Required fields | Required evidence |
|---|---|---|---|
| T1 | Issue to Site | device, destination site, receiving holder, date | Delivery note (optional) |
| T2 | Assign to Driver | device, driver, accessory checklist, condition grade | Signed Company Handout Form (**mandatory**) |
| T3 | Replacement | outgoing device, incoming device, reason code, condition grade | Signed form + fault note |
| T4 | Return | device, reason code, condition grade, accessory completeness | Return acknowledgement + photo |
| T5 | Transfer / Retire / Lost | device, destination site or retirement reason | Approval record (L4) for retire/lost |

T3 creates **two linked ledger entries** sharing a `replacementRef` — the outgoing device closes before the incoming device opens.

### Controlled vocabularies (no free text)

- **Reason codes:** `resignation`, `site_transfer`, `damage`, `malfunction`, `loss`, `upgrade`, `end_of_life`
- **Condition grades:** `A` serviceable, `B` minor damage, `C` major damage, `D` unserviceable
- **Accessories:** `charger`, `cable`, `case`, `mount`, `sim`

---

## 6. Process rules (impersonal standard)

These are the business rules the system enforces. Written as standard text for the accompanying SOP/WI.

1. A device shall not be handed over to a driver before the Company Handout Form has been signed and attached to the transaction record.
2. The party transferring a device shall record the transaction, and the receiving party shall confirm it. A device status shall not change until confirmation is recorded.
3. Every transaction shall be recorded on the same day the physical handover takes place.
4. Recorded transactions shall not be edited or deleted. An incorrect entry shall be corrected by a correction record referencing the original transaction.
5. A device shall have only one identifiable holder at any given time.
6. A replacement shall be processed by closing the outgoing device record before the incoming device record is opened, with both entries linked by a common replacement reference.
7. A device shall not be issued to a holder who is not registered in the holder directory.
8. A physical stock count shall be performed at each site at least once per quarter, and discrepancies shall be recorded as exceptions within two working days.
9. Transactions recorded at site level shall be verified for accuracy within seven working days of the record date.
10. Where a device is lost or damaged beyond use, a write-off request with supporting evidence shall be approved before the status is amended.
11. A device remaining in assigned status for a holder whose employment has ended shall be escalated as an exception on the day the separation is notified.

---

## 7. Data model — MongoDB collections

### `devices`
```js
{
  _id: ObjectId,
  imei: String,              // unique index
  serial: String,            // unique index
  model: String,
  phoneNumber: String,
  status: String,            // enum, derived — set only by confirmed transactions
  currentHolderId: ObjectId, // ref holders, null when in stock at site
  currentSiteId: ObjectId,   // ref sites
  registeredAt: Date,
  registeredBy: ObjectId,
  active: Boolean
}
```

### `transactions`
```js
{
  _id: ObjectId,
  txNumber: String,          // human reference, e.g. TX-2026-00412
  type: String,              // T1 | T2 | T3 | T4 | T5
  deviceId: ObjectId,
  imei: String,              // denormalised for history integrity
  fromHolderId: ObjectId,
  toHolderId: ObjectId,
  fromSiteId: ObjectId,
  toSiteId: ObjectId,
  reasonCode: String,
  conditionGrade: String,
  accessories: { charger: Boolean, cable: Boolean, case: Boolean, mount: Boolean, sim: Boolean },
  attachments: [{ type: String, url: String, uploadedAt: Date }],
  replacementRef: String,    // links the two entries of a T3
  correctsTxId: ObjectId,    // set on correction records
  confirmState: String,      // pending | confirmed | rejected
  createdBy: ObjectId,
  createdAt: Date,
  confirmedBy: ObjectId,
  confirmedAt: Date,
  rejectionNote: String
}
```

Indexes: `deviceId + createdAt`, `confirmState`, `toHolderId`, `txNumber` (unique)

### `holders`
```js
{
  _id: ObjectId,
  type: String,              // driver | site_leader
  name: String,
  employeeNo: String,
  siteId: ObjectId,
  phone: String,
  active: Boolean,
  separatedAt: Date          // triggers orphan-assignment exception
}
```

### `sites`
```js
{ _id: ObjectId, code: String, name: String, active: Boolean }
```

### `users`
```js
{
  _id: ObjectId,
  email: String,             // unique
  name: String,
  level: String,             // L1 | L2 | L3 | L4
  siteScope: [ObjectId],     // empty = all sites (L4)
  active: Boolean
}
```

### `exceptions`
```js
{
  _id: ObjectId,
  type: String,              // unreconciled | orphan_assignment | stale_record | missing_evidence
  deviceId: ObjectId,
  siteId: ObjectId,
  detail: String,
  status: String,            // open | investigating | resolved
  raisedAt: Date,
  resolvedAt: Date,
  resolvedBy: ObjectId
}
```

### `auditLog`
```js
{
  _id: ObjectId,
  collection: String,
  recordId: ObjectId,
  action: String,
  actorId: ObjectId,
  before: Object,
  after: Object,
  at: Date
}
```

**Write discipline:** `devices.status` and `devices.currentHolderId` are never written by a client request. They are updated server-side only inside the confirmation handler, in the same operation as the transaction confirm. Use a MongoDB transaction (Atlas replica set supports this) so the ledger entry and the device state never diverge.

---

## 8. Application structure

```
phone-asset/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                      shell + role guard
│   │   ├── page.tsx                        dashboard
│   │   ├── devices/
│   │   │   ├── page.tsx                    list + filter by site/status
│   │   │   ├── [imei]/page.tsx             detail + custody timeline
│   │   │   └── new/page.tsx                register (L1 only)
│   │   ├── transactions/
│   │   │   ├── page.tsx                    ledger view
│   │   │   ├── new/page.tsx                T1–T5 form
│   │   │   └── [id]/page.tsx               detail + confirm/reject
│   │   ├── inbox/page.tsx                  pending confirmations for me
│   │   ├── holders/page.tsx                drivers, site leaders
│   │   ├── stock-count/page.tsx            quarterly count entry
│   │   ├── exceptions/page.tsx
│   │   └── admin/page.tsx                  users, roles, sites (L4)
│   └── api/
│       ├── devices/route.ts                GET list, POST register
│       ├── devices/[imei]/route.ts         GET detail + history
│       ├── transactions/route.ts           GET list, POST create
│       ├── transactions/[id]/confirm/route.ts
│       ├── transactions/[id]/reject/route.ts
│       ├── holders/route.ts
│       ├── exceptions/route.ts
│       ├── upload/route.ts                 signed form, photos
│       └── reports/route.ts                export
├── lib/
│   ├── mongodb.ts                          cached Atlas client
│   ├── auth.ts                             session + user level
│   ├── permissions.ts                      L1–L4 matrix + site scope check
│   ├── state-machine.ts                    allowed transitions table
│   ├── codes.ts                            reason, condition, accessory enums
│   ├── tx-number.ts                        sequence generator
│   └── validators.ts                       zod schemas, shared client/server
├── models/                                 collection types + index setup
├── components/
│   ├── ui/                                 shadcn
│   ├── device/                             StatusBadge, CustodyTimeline, DevicePicker
│   ├── transaction/                        TxForm, AccessoryChecklist, SignaturePad,
│   │                                       ConditionGrade, ConfirmCard, EvidenceUpload
│   └── layout/
├── types/
└── middleware.ts                           route protection by level
```

---

## 9. Key flows to implement

### Create a transaction
1. User selects device from a picker (scoped to their site) — IMEI never typed.
2. Form renders fields required for the chosen transaction type.
3. Zod validates; `state-machine.ts` checks the transition is allowed from the device's current status.
4. T2 and T3 reject submission if no signed form is attached.
5. Record written with `confirmState: "pending"`. Device status unchanged.
6. Receiving party sees it in their inbox.

### Confirm a transaction
1. Receiver opens the pending record, reviews accessories and condition.
2. On confirm — inside one MongoDB transaction: set `confirmState: "confirmed"`, update `devices.status`, `currentHolderId`, `currentSiteId`, write audit entry.
3. On reject — set `confirmState: "rejected"` with a note. Device state untouched. The sender must raise a new record.

### Correction
No edit. User creates a new transaction with `correctsTxId` pointing at the original. Both remain visible in the device timeline.

### Replacement (T3)
Generate one `replacementRef`. Write the outgoing-device return entry and the incoming-device assignment entry together. Both require confirmation before either device's status moves.

---

## 10. Dashboard and reporting

Dashboard cards: total devices, by status, by site, pending confirmations older than 2 days, open exceptions.

Control indicators to display:

| Indicator | Target |
|---|---|
| Devices with complete custody chain | 100% |
| Assignments with signed form attached | 100% |
| Same-day recording compliance | ≥ 95% |
| Stock count accuracy | ≥ 98% |
| Open exceptions older than 30 days | 0 |

Export: device register and transaction ledger to CSV/Excel, filtered by site and date range.

---

## 11. Technical choices

- **DB driver:** official `mongodb` Node driver with a cached client for serverless, or Mongoose if schema validation in the ORM layer is preferred. Atlas connection string from Vercel environment variables.
- **Auth:** Auth.js (NextAuth) with credentials or Microsoft Entra ID if company accounts are to be reused.
- **UI:** Tailwind + shadcn/ui.
- **Validation:** Zod schemas shared between client form and API route.
- **File storage:** Vercel Blob for signed forms and condition photos. Store the returned URL in `transactions.attachments`.
- **Mobile first:** site leaders will use phones. Forms must work one-handed, with camera capture for photos and a touch signature pad.

---

## 12. Suggested build order

1. MongoDB connection, collection types, index setup.
2. Auth + `permissions.ts` + middleware.
3. Device register: list, detail, create (L1).
4. `state-machine.ts` with unit tests for every allowed and forbidden transition.
5. Transaction create (T1, T2) with pending state.
6. Confirmation flow with the MongoDB transaction block.
7. Custody timeline on the device detail page.
8. Remaining transaction types (T3, T4, T5).
9. File upload and signature capture.
10. Exceptions and stock count.
11. Dashboard and export.
12. Admin screens.

---

## 13. Out of scope

- Device procurement and IT registration workflow upstream of this system.
- MDM, device configuration, or remote wipe.
- Telecom billing and plan management.
