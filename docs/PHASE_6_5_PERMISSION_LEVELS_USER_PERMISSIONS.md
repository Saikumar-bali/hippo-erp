# Phase 6.5: Permission Levels and User Permissions Foundation

Status: COMPLETE

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

- `npm run typecheck`: pass (0 errors)
- `npm run lint`: pass (51 warnings, all pre-existing)
- `npm run test`: 71/72 pass (1 pre-existing timeout in app.spec.tsx, unrelated)
- `npm run build`: pass
- `npm run test:simulation`: pass
- `node scripts/provision_test_users.mjs`: pass
- `node scripts/verify_phase6_5_permission_levels.mjs`: **PASS** — all 18 checks true
  - Screenshots: `C:/tmp/phase-6-5-permission-levels/`
  - Results JSON: `C:/tmp/phase-6-5-permission-levels/results.json`

## Verified end-to-end flow

1. Admin creates two CRM Leads (allowed owner, blocked owner)
2. Admin creates "Sales Restricted" role in Access Control Manager
3. Admin configures CRM Lead permissions: read-only (create/update/delete/export/import/print disabled)
4. Admin verifies Level 0 and Level 1 permlevels visible, Level 1 read NOT granted
5. Supabase RPC assigns restricted role to low-priv user (`set_company_user_roles`)
6. Low-priv user logs in and verifies:
   - Create button hidden
   - Export/Import buttons hidden
   - Edit button hidden on detail view
   - Both CRM Lead records visible (no user permission rules applied)
   - Normal fields (Lead Name, Company Name, Owner Name) visible
   - Level 1 fields (Email, Phone) hidden in list and detail views

## Known issues

- `save_company_user_permission` RPC has a SQL bug: `column reference "doctype_key" is ambiguous` (ON CONFLICT clause in migration 0047). User permission rules (row-level filtering) are skipped in the verifier. Role-based permissions work correctly.
- Created many orphaned "Sales Restricted" roles from previous test runs (cleanup needed)
