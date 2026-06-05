# Phase 6.5: Permission Levels and User Permissions Foundation

Status: COMPLETE

## Goal

Bring metadata-driven access control closer to Frappe-style behavior by adding:

- field-level permission levels on DocFields
- role-level grants for those field levels
- record-level user-permission rules for metadata-driven DocTypes

CRM Lead is the proof target for this phase.

## Implemented

### Database

- Added `supabase/migrations/0047_permission_levels_user_permissions.sql`
- Added `supabase/migrations/0048_fix_save_company_user_permission.sql` (idempotent fix for fresh installs)
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

### Bug Fix

- `save_company_user_permission` had an `ON CONFLICT` clause with ambiguous column references (output parameter names shadowed table column names). Fixed by replacing with manual upsert using `exception when unique_violation` pattern.
- Applied to Supabase Cloud via Management API on 2026-06-05.

## Validation

### Pipeline (all PASS)

| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 53 warnings (all pre-existing) |
| `npm run test` | 72/72 pass |
| `npm run build` | success |
| `npm run test:simulation` | success |
| `node scripts/provision_test_users.mjs` | success |

### Cloud Verification (20/20 checks PASS)

| Check | Status |
|-------|--------|
| schema.erp_docfields.permlevel | PASS |
| schema.crm_lead.level0_fields | PASS |
| schema.crm_lead.level1_fields | PASS |
| schema.crm_lead.level1_has_email | PASS |
| schema.crm_lead.level1_has_phone | PASS |
| schema.company_user_permissions | PASS |
| schema.save_company_user_permission_exists | PASS |
| schema.save_company_user_permission_fix | PASS |
| schema.save_company_user_permission_no_on_conflict | PASS |
| schema.migration_0047_applied | PASS |
| rpc.admin_login | PASS |
| rpc.get_my_companies | PASS |
| rpc.get_company_users | PASS |
| rpc.save_company_user_permission_insert | PASS |
| rpc.save_company_user_permission_upsert | PASS |
| rpc.user_permission_rule_exists | PASS |
| rpc.low_priv_login | PASS |
| rpc.allowed_lead_visible | PASS |
| rpc.blocked_lead_hidden | PASS |
| rpc.level1_email_hidden_in_list | PASS |
| rpc.level1_phone_hidden_in_list | PASS |
| rpc.update_level1_field_attempted | PASS |
| rpc.crm_opportunity_create | PASS |
| rpc.crm_opportunity_read | PASS |
| rpc.crm_opportunity_delete | PASS |

### Browser Verification (18/18 checks PASS)

| Check | Status |
|-------|--------|
| adminLogin | PASS |
| leadsCreated | PASS |
| salesRestrictedRoleCreated | PASS |
| level0VisibleInManager | PASS |
| level1VisibleInManager | PASS |
| grantViewCrmLeadOnly | PASS |
| level1ReadNotGranted | PASS |
| lowPrivRoleAssigned | PASS |
| userPermissionRuleSaved | PASS |
| lowPrivLogin | PASS |
| createBlocked | PASS |
| exportImportBlocked | PASS |
| allowedRecordVisible | PASS |
| blockedRecordHidden | PASS |
| normalFieldsVisible | PASS |
| level1FieldHiddenInList | PASS |
| updateBlocked | PASS |
| level1FieldHiddenInDetail | PASS |
| noPageErrors | PASS |

### Artifacts

- Cloud verification: `C:/tmp/phase-6-5-permission-levels/cloud-verification-results.json`
- Browser results: `C:/tmp/phase-6-5-permission-levels/results.json`
- Screenshots: `C:/tmp/phase-6-5-permission-levels/01-admin-leads-created.png` through `04-low-priv-detail.png`

## Verified End-to-End Flow

1. Admin creates two CRM Leads (allowed owner = low-priv user, blocked owner = other)
2. Admin creates "Sales Restricted" role in Access Control Manager
3. Admin configures CRM Lead permissions: read-only (create/update/delete/export/import/print disabled)
4. Admin verifies Level 0 and Level 1 permlevels visible, Level 1 read NOT granted
5. Supabase RPC assigns restricted role to low-priv user (`set_company_user_roles`)
6. Supabase RPC creates user permission rule: `owner_name = lowPrivEmail` (row-level filtering)
7. Low-priv user logs in and verifies:
   - Create button hidden
   - Export/Import buttons hidden
   - Edit button hidden on detail view
   - Allowed CRM Lead visible, blocked CRM Lead hidden (row-level filtering works)
   - Normal fields (Lead Name, Company Name, Owner Name) visible
   - Level 1 fields (Email, Phone) hidden in list and detail views
8. CRM Opportunity generic_json CRUD confirmed working

## Migration History

- Migration 0047 was already applied to Supabase Cloud (version `20260605063738`)
- The SQL bug fix was applied directly via Supabase Management API (not via migration re-run)
- Migration 0048 created as idempotent `CREATE OR REPLACE` for fresh database installs
