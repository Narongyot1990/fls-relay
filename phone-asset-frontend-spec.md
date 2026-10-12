# Phone Asset Management — Frontend Specification

**Companion to:** `phone-asset-management-spec.md`
**Scope:** UI structure, screens, interaction. Visual theme is deliberately deferred — layout and flow are decided first, styling comes after.

---

## 1. Design principle

The backend thinks in transaction codes (T1–T5). **The user must never see them.**

A site leader standing next to a truck at 06:00 does not think "I will record a T2". He thinks *"I am giving this phone to Somchai"*. The interface is built around what the person is doing, and the system maps it to the correct transaction type behind the scenes.

Three rules that override everything else:

1. **One task per screen.** No screen asks the user to do two unrelated things.
2. **Three taps to the goal.** Any routine action completes in three taps plus the evidence capture.
3. **Nothing is typed that can be chosen.** No IMEI entry, no name entry, no date entry. Pickers and defaults only.

The system is correct when a site leader who has never been trained can complete a handover without asking anyone.

---

## 2. Who uses what

| Role | Device | Frequency | What they need |
|---|---|---|---|
| Site Leader (L2) | Phone, one-handed, outdoors | Daily | Hand out, take back, confirm. Nothing else. |
| Ops Supervisor (L3) | Phone and laptop | Weekly | Same as L2 across sites, plus verify and stock count. |
| IT (L1) | Laptop | Occasional | Register devices in batches. |
| Management (L4) | Laptop | Monthly | Overview, approvals, export. |

**Consequence:** the phone experience is the primary design target, not a responsive afterthought. The laptop screens are the easier problem and are designed second.

---

## 3. Task-first navigation

### Home screen — Site Leader

The home screen is a list of actions, not a dashboard. Large tap targets, stacked vertically, full width.

```
┌─────────────────────────────┐
│  Rayong site                │
│  14 phones · 2 in stock     │
├─────────────────────────────┤
│                             │
│  ⚠  2 waiting for you       │  ← only shown when count > 0
│                             │
├─────────────────────────────┤
│  →  Hand out a phone        │
├─────────────────────────────┤
│  ←  Take back a phone       │
├─────────────────────────────┤
│  ⇄  Swap a phone            │
├─────────────────────────────┤
│  ☰  All phones at my site   │
└─────────────────────────────┘
```

Mapping, invisible to the user:

| Button | Transaction |
|---|---|
| Hand out a phone | T2 (or T1 if the recipient is another site leader) |
| Take back a phone | T4 |
| Swap a phone | T3 |
| Send to another site | T5 — hidden under "All phones", not on home |

### Home screen — Supervisor and Management

Same action list, plus a summary strip at the top: pending confirmations, open exceptions, phones unaccounted for. Supervisor additionally gets "Start stock count". Management gets "Approvals" and "Export".

### Navigation model

Bottom bar on phone, three items only: **Home**, **Inbox** (with badge), **Phones**. No hamburger menu, no nested menus. Admin screens are reachable by URL from the laptop only.

---

## 4. The handover flow (the screen that matters most)

Four steps. A progress indicator shows `1 of 4`. Back is always available; nothing is saved until the final step.

### Step 1 — Which phone

```
┌─────────────────────────────┐
│  ← Hand out a phone    1/4  │
├─────────────────────────────┤
│  📷  Scan phone             │  ← big primary button, camera opens
├─────────────────────────────┤
│  or pick from your stock    │
│                             │
│  ○  Samsung A15             │
│     ····4821 · in stock     │
│  ○  Samsung A15             │
│     ····4822 · in stock     │
└─────────────────────────────┘
```

Only devices in the user's own site stock are listed. A device already assigned cannot appear — the invalid choice does not exist rather than being rejected later.

IMEI is shown as the last four digits. The full number is never displayed in a picker and never typed.

### Step 2 — Who gets it

```
┌─────────────────────────────┐
│  ← Hand out a phone    2/4  │
├─────────────────────────────┤
│  🔍 Search driver           │
├─────────────────────────────┤
│  ○  สมชาย ใจดี   DRV-0142   │
│  ○  วิชัย สุขสม   DRV-0188   │
│  ○  ประสิทธิ์ ...  DRV-0203  │
├─────────────────────────────┤
│  Or hand to another         │
│  site leader           →    │
└─────────────────────────────┘
```

Drivers at the user's site are listed first. Search filters by name or employee number. A driver marked as separated does not appear.

### Step 3 — What goes with it

```
┌─────────────────────────────┐
│  ← Hand out a phone    3/4  │
├─────────────────────────────┤
│  Accessories included       │
│  ☑ Charger    ☑ Cable       │
│  ☑ Case       ☐ Mount       │
│  ☑ SIM                      │
├─────────────────────────────┤
│  Condition                  │
│  ●A  ○B  ○C  ○D             │
│  A — serviceable            │
├─────────────────────────────┤
│  📷 Photo of the phone      │
│  [ thumbnail ]              │
└─────────────────────────────┘
```

Accessories default to all checked except mount — the common case needs no interaction. Condition defaults to A. The condition letter always shows its meaning in words underneath; the grade letters alone are meaningless to a new user.

### Step 4 — Signature and submit

```
┌─────────────────────────────┐
│  ← Hand out a phone    4/4  │
├─────────────────────────────┤
│  Samsung A15 ····4821       │
│  to สมชาย ใจดี  DRV-0142    │
│  Charger, cable, case, SIM  │
│  Condition A                │
├─────────────────────────────┤
│  Company Handout Form       │
│  📎 Upload signed form      │
│   — or —                    │
│  ✍  Sign on screen          │
│  ┌───────────────────────┐  │
│  │                       │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  [    Hand over phone    ]  │  ← disabled until form present
└─────────────────────────────┘
```

The summary is a plain read-back in words, not a form. The submit button is disabled with a visible reason — "Signed form required" — never silently inactive.

### After submit

```
✓  Sent to สมชาย ใจดี
   Waiting for him to confirm.
```

The screen states plainly that the phone is **not yet transferred** and that confirmation is pending. This is the single most important message in the product — it teaches the two-sided rule by using it.

---

## 5. The inbox (confirmation)

Anything waiting for the user is here. One card per pending item.

```
┌─────────────────────────────┐
│  Waiting for you            │
├─────────────────────────────┤
│  Samsung A15 ····4821       │
│  From: Site leader Rayong   │
│  Today 07:14                │
│  Charger, cable, case, SIM  │
│  Condition A                │
│  [ photo thumbnail ]        │
│                             │
│  [ Confirm ]  [ Something   │
│                 is wrong ]  │
└─────────────────────────────┘
```

"Something is wrong" is used instead of "Reject" — rejection sounds like blaming a person, and the user will avoid it. The follow-up asks what is wrong from a short list (wrong phone, accessory missing, damaged, not me) plus an optional note.

Confirm is a single tap. No confirmation dialog on top of a confirmation.

---

## 6. Device detail and history

One screen per device. Current state at the top, full custody chain below as a vertical timeline, most recent first.

```
┌─────────────────────────────┐
│  Samsung A15                │
│  IMEI 35************4821    │
│  ● Assigned                 │
│  สมชาย ใจดี · Rayong        │
│  Since 12 Oct 2026          │
├─────────────────────────────┤
│  History                    │
│                             │
│  ●  12 Oct  Handed to       │
│  │          สมชาย ใจดี       │
│  │          Confirmed ✓     │
│  │                          │
│  ●  08 Oct  Returned by     │
│  │          วิชัย สุขสม       │
│  │          Condition B     │
│  │                          │
│  ●  02 Sep  Issued to       │
│  │          Rayong site     │
│  │                          │
│  ○  28 Aug  Registered      │
└─────────────────────────────┘
```

The timeline is the product's proof of value. Every entry is tappable to see its evidence and who recorded and confirmed it. Corrections appear in place, visibly marked as a correction to an earlier entry — never hidden, never overwriting.

---

## 7. Phone list

Default filter is the user's own site. Status shown as a coloured dot plus a word — never colour alone.

```
┌─────────────────────────────┐
│  Phones          [ Filter ] │
├─────────────────────────────┤
│  ● Assigned    ····4821     │
│    สมชาย ใจดี                │
├─────────────────────────────┤
│  ● In stock    ····4822     │
│    Rayong site              │
├─────────────────────────────┤
│  ● Pending     ····4830     │
│    Waiting for วิชัย         │
└─────────────────────────────┘
```

Filters: status, site (L3/L4 only), holder. Search by last four digits or holder name. No advanced query builder.

---

## 8. Component inventory

Keep the set small. Every component below is reused across screens; nothing is built for one screen only.

| Component | Purpose |
|---|---|
| `ActionButton` | Full-width home screen action, icon + label |
| `DevicePicker` | Scan or select, scoped to permitted stock |
| `HolderPicker` | Searchable person list, scoped to site |
| `AccessoryChecklist` | Five checkboxes with sensible defaults |
| `ConditionGrade` | Four options, always with word labels |
| `EvidenceCapture` | Camera or file, thumbnail preview, remove |
| `SignaturePad` | Touch canvas, clear and accept |
| `StatusBadge` | Dot + word, one per status |
| `CustodyTimeline` | Vertical event list with evidence links |
| `ConfirmCard` | Pending item with confirm / something-wrong |
| `StepHeader` | Back arrow, title, `n of 4` |
| `SummaryReadback` | Plain-language review before submit |
| `EmptyState` | Icon, one sentence, one action |

---

## 9. States every screen must handle

A screen is not finished until all five exist.

| State | Requirement |
|---|---|
| Loading | Skeleton of the real layout, not a spinner |
| Empty | One sentence explaining why it is empty, plus the action that fills it |
| Error | What failed, in plain words, plus a retry button. Never a code. |
| Offline | Banner at top; form input still works, submit queues and reports "will send when back online" |
| Success | Confirmation that states what happens next, not just "saved" |

---

## 10. Writing rules for the interface

The words are part of the design, not decoration added later.

- No transaction codes, no status enums, no field names from the database.
- Say what happened and what happens next: "Sent to สมชาย. Waiting for him to confirm" — not "Transaction created".
- Errors describe the situation, not the system: "This phone is already with someone" — not "Invalid state transition".
- Buttons are verbs that match the user's intent: "Hand over phone", not "Submit".
- Bilingual: Thai for site users, English for management screens and exports. Build the string table from day one, do not retrofit it.

---

## 11. Mobile constraints to design against

- Minimum tap target 48×48px, 12px apart. The user may be wearing gloves.
- Primary action sits in the lower third of the screen, reachable by thumb.
- Readable in sunlight: high contrast, no light grey on white for anything that must be read.
- Forms survive interruption — a phone call mid-handover must not lose the entered data.
- No horizontal scrolling anywhere, no pinch-to-zoom required.
- Camera opens directly, no intermediate "choose source" dialog on mobile.

---

## 12. What is deliberately not in the interface

Listed so they are not added by reflex later:

- A dashboard as the site leader's home screen — he has no use for charts.
- Transaction type selector — the task buttons choose it.
- Free-text IMEI, name, or date fields.
- Edit and delete on any historical record.
- Notifications beyond the inbox badge, until the inbox proves insufficient.
- Dark mode, animations, and theming — after the flows are validated.

---

## 13. Build order for the frontend

1. Static screens with mock data — no backend, no state. Click through the whole handover flow.
2. Review with a real site leader. Watch, do not explain. Fix what needs explaining.
3. Wire the handover flow and inbox to the API.
4. Device detail and timeline.
5. Remaining flows: take back, swap, send to site.
6. Supervisor and management screens.
7. Empty, error, and offline states.
8. Theme, colour, and typography pass.

Step 2 is not optional. Everything above step 2 is an assumption until then.
