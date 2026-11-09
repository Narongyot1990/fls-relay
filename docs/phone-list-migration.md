# IT phone-list migration — 9 November 2026

The user explicitly requested clearing the application's existing database and
loading the updated `_phone_list.csv`, leaving phone relationships for manual
testing. The configured database `fls-relay` was inspected before any mutation.

## Completed data reset

| Collection | Before | After |
| --- | ---: | ---: |
| devices | 36 | 28 |
| holders | 4 | 12 |
| sites | 2 | 2 |
| models | 0 | 1 |
| custody_transactions | 8 | 0 |
| transactions | 0 | 0 |

Sites use code → display name: `CPO_CHO` → `CPOCHO`, `CPO_MTP` → `CPOMTP`.
Each site has six drivers, using the supplied Driver Site. No Site Leaders were
invented because none were supplied in the CSV.

All 28 phones are registered central stock with null current site and holder.
No handovers, signatures or accessory evidence were generated. The 16 rows with
no driver data create phones only. Missing IMEI/phone numbers remain blank.

Device name is repeated across all source rows. The supplied unique Serial number
is therefore used as the operational Device ID, while Device name, Serial number,
Manufacturer and Model retain their supplied values. Driver Id maps to FLS Employee
ID, Driver name to the person name, and Driver Site to site affiliation. Leading/
trailing whitespace is removed; no source identities are guessed.

Manufacturer is now supported in phone read/create/edit APIs and individual add/
edit forms, plus technical details. This supports subsequent one-at-a-time additions.

## Backup and verification

The complete pre-reset contents of all six collections were read in a snapshot
transaction and written as canonical Extended JSON, with collection options,
indexes, record counts and SHA-256 hashes. Every data backup was read back and
verified before deletion. The original CSV, new-data plan and completion report
are stored alongside the backup.

Local, git-ignored backup directory:
`.local-backups/phone-list-2026-11-09T06-45-38-825Z/`.
Do not commit or publish this directory or the source staff/device CSV.

Replacement used one MongoDB transaction. The script checked that the database
had not changed since backup, then cleared data and inserted the reviewed plan.
Post-commit counts and full field comparisons passed, and an independent read
verified unique serial-based IDs, both site affiliations, Manufacturer completeness,
zero phone assignments and empty history.

`scripts/migrate-phone-list.mjs` defaults to read-only preview. A reset requires
explicit `--commit`, the exact `--expected-db` and the reviewed `--source-sha256`.
Do not rerun a reset after manual testing has started unless a new reset is intended.

Migration parsing, duplicate/conflict checks, blank-driver handling and Manufacturer
persistence are covered by the inventory tests. Browser write tests use intercepted
requests and do not modify the imported company records.

Validation passed: 40 inventory/API tests, the targeted Manufacturer browser flow,
TypeScript, ESLint and production build. Next.js continues to emit the existing
security upgrade reminder. Live read-only API checks returned 28 phones, 12 drivers,
six drivers per site, zero Site Leaders and no assigned phones. Backup hashes for
all six original collections were rechecked after completion.

Refresh the app after migration to discard cached references to the old record IDs.
Use Implementation to test direct issue from central stock, or create actual Site
Leaders in Directory before testing site custody. This data reset does not deploy
application code.
