# Site & People: first implementation

Based on `Driver_Phone_Issuing__Return_Process.pdf`, pages 1 and 3, and the user's confirmed scope rules.

## Workflow

1. A central IT/System Admin operator creates a site with a stable site code and display name.
2. Register the site's Site Leader and drivers as separate person types, with a unique FLS Employee ID, full name and assigned site. A contact phone is optional.
3. The Site Leader becomes selectable in the role preview from the real holder record. Drivers appear only in driver selection, within the operator's site/scope.
4. A subsequent operational transfer moves phone custody into the site. Creating a site or person does not transfer stock, create an assignment or generate a driver acknowledgement.

The PDF requests maintained staff/site references and separate Site Leader/driver recipient selection. This directory is the minimal maintained source now; importing maintained staff lists can be added later without changing person IDs.

## Rules implemented

- Site codes are required, normalized to uppercase, 2–24 alphanumeric/hyphen/underscore characters, and unique. The display name is required and supports Thai/English.
- FLS Employee IDs are required, normalized to uppercase and unique across both person types. IDs remain strings, preserving leading zeroes.
- People require an existing active site. Central IT/Implementation/Admin roles are not registered as site-affiliated holders through this form.
- New records start active. There is no automatic seed, background creation or phone write.
- IT/System Admin can add directory records. Implementation and Site Leader use the directory within their viewing scope. Production remains publicly testable as requested; the role selector is a workflow selector, not authentication.
- New endpoints: `POST /api/inventory/sites` and `POST /api/inventory/people`. Duplicate codes/employee IDs return 409; invalid/missing/inactive sites are rejected.

## UI fixes delivered with this feature

- Delete confirmation uses a modal portal with a visible Cancel/Confirm action, focus management and errors inside the dialog. It no longer sits below the long inventory list or depend on opening Edit.
- Delete and Save disable duplicate submission while pending. The active button displays a spinner and `aria-busy`.
- Import preview/import buttons show progress for the actual request. Role/site changes and record refreshes display a loading bar; client view changes use React transitions without artificial delays.
- Directory forms show saving/errors and refresh real lists after success. A new person created outside the selected site filter switches to the target site so the new record is visible.
- Existing data stays visible during a same-scope refresh. Changing scope clears it while loading, preventing display of a previous site's records.

## Follow-up ideas (not implemented in this step)

- Import approved staff/site lists with duplicate review using the same stable codes/employee IDs.
- Edit names/contact data and deactivate departed staff/sites while retaining history. Moving someone to another site must account for devices still assigned to them.
- Implement the PDF's batch Transfer to Site Leader with issuer-recorded versus requested-confirmation modes. A Site Leader transfer does not require the driver policy form.
- Keep driver issue separate: select driver → select eligible phone → read the supplied agreement → acknowledge/sign → persist the assignment and PDF when that backend is ready.

## Validation

Browser tests use Edge with all `/api/**` requests intercepted. They cannot insert, edit or delete actual MongoDB records. Coverage includes a 35-item mobile inventory, opening Delete without Edit, pending/error/cancel behavior, Save progress, site/person forms, the new Site Leader appearing in role selection, missing-site validation and import-preview loading. API/unit checks use in-memory collections for duplicate and active-site validation.
