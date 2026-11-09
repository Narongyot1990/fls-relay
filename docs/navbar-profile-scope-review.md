# Navbar, profile and viewing scope

9 November 2026. Open `/preview` to review.

- The sticky navbar contains the compact FLS identity, EN/TH controls and a Profile
  button. Desktop shows the selected role or Site Leader name; mobile shows a short
  role avatar to preserve space.
- Profile opens a popup with a Role dropdown. Site Leader additionally exposes an
  Operator dropdown backed by the maintained active directory. Apply profile commits
  the selection and returns to the main menu. Cancel/Escape leaves the current role
  and scope unchanged. A Site Leader cannot be applied without an active operator.
- The old Role/View row is removed. A separate viewing-scope card in the workspace
  shows the currently selected site. Change scope opens a searchable site chooser,
  with All sites and Central stock shortcuts. Choosing a site applies it directly
  without changing the selected profile.
- Site Leaders see their assigned site and a Your site only label; the scope chooser
  is unavailable. Changing their operator happens inside Profile.
- Profile and scope controls respect the existing parent save/loading guards. Popup
  focus returns to its trigger on Cancel/Escape. Both popups use the workspace font
  and fit mobile viewports.
- This reorganizes the existing public testing role switcher; it does not introduce
  a new login or invent an employee identity for central roles.

## Screenshots

These screenshots use synthetic QA data only.

- [Mobile navbar and scope](./review/navbar-home-mobile.png)
- [Desktop navbar and scope](./review/navbar-home-desktop.png)
- [Profile popup](./review/navbar-profile-mobile.png)
- [Site chooser](./review/navbar-scope-mobile.png)

## Verification

The existing 33 browser scenarios now change roles through the actual Profile popup
and pass. Six additional scenarios cover applying/cancelling profiles, focus
restoration, searchable scopes and central-stock filtering, Site Leader operator
boundaries, unavailable operators, pending saves and EN/TH responsive layout.
TypeScript, ESLint and the language dictionary check pass.
The production build passes after the installed Next.js security upgrade reminder;
that existing version warning still needs addressing before production rollout.

No real records are changed by the browser tests and no deployment is performed.
