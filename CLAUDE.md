# Claude handoff

Read [AGENTS.md](AGENTS.md) first, then [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the current architecture, entry points, implemented features, constraints and next work.

Key working rules:

- Main UI: `/preview` -> `components/inventory/InventoryWorkspace.tsx`. `/` redirects there; there is no root `app/page.tsx`.
- Preserve the reviewed mobile UI and default-English EN/TH switch.
- Use real data; never automatically seed, reset or import the user's spreadsheet.
- Production is intentionally public for testing at the user's request. Do not reintroduce authentication without a new request.
- Central roles have no site affiliation; Site Leaders/drivers have an assigned site. Central stock is a null site, not a third site.
- New inventory endpoints use MongoDB `_id`; older routes use IMEI and are not the current architecture.
- Driver handover signing is review-only. Do not claim persisted assignments, signatures or PDFs until implemented.
- Keep secrets and `.local-backups/` contents out of output and Git. Local development may share the live database.
- Run relevant checks; preserve browser API interception to avoid real test writes. Verify Git/Vercel state before claiming a deployment.

The original root specifications include older plans. Latest user instructions and the current handoff explain the accepted changes.
