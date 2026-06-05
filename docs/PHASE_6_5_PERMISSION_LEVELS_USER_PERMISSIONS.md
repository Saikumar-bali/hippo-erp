# Phase 6.5: Permission Levels and User Permissions Foundation

Status: in progress

## Goal

Bring metadata-driven access control closer to Frappe-style behavior by adding:

- field-level permission levels on DocFields
- role-level grants for those field levels
- record-level user-permission rules for metadata-driven DocTypes

CRM Lead is the proof target for this phase.

## Implemented so far

### Database

- Added `supabase/migrations/0047_permission_levels_user_permissions.sql`
- Added `permlevel` to `app.erp_docfields`
- Added validation for valid permlevel range
- Seeded CRM Lead sensitive fields (`email`, `phone`, `notes`) to level 1
- Added `app.company_doctype_permlevels`
- Added `app.company_user_permissions`
- Added RPCs to:
  - read effective field access
  - save role permlevel grants
  - read/save user permission rules
  - enforce field masking and record-level filtering in generic document RPCs

### Frontend

- Added `permlevel` support to metadata field types
- Added permission-level editing in Field Builder
- Added `use-doctype-field-access` hook
- Updated generic metadata list/detail/form pages to:
  - hide unreadable fields
  - remove unreadable list columns and filters
  - avoid submitting non-writable fields
- Added field-level permissions section to Access Control Manager
- Added compact User Permissions panel to User Role Assignment

### Validation

- `npm run typecheck`: pass
- `npm run lint`: pass with warnings
- `npm run test`: pass
- `npm run build`: pass
- `npm run test:simulation`: pass
- `node scripts/provision_test_users.mjs`: pass with current env setup

## Current blocker

The dedicated Phase 6.5 Playwright verifier is partially working but not fully stable yet for the admin-side setup flow inside:

- Access Control Manager
- User Role Assignment / User Permissions panel

The restricted-user proof flow is not ready to be marked complete until that verifier passes end-to-end with screenshots and results JSON.

## Remaining work

- stabilize the Phase 6.5 Playwright verifier
- complete CRM Lead owner-restriction proof with two records
- capture final screenshots/results JSON
- update the AI run report with final PASS/FAIL outcomes
- push the branch after verification is green
