# Phase 6.8.1 — Report Builder Security Hardening

## Overview

Hardens Phase 6.8 Report Builder so it cannot bypass DocType read permission, field-level permlevel, record-level user permissions, workflow/docstatus restrictions, audit/version security, or company scoping. Backend/RPC enforces all access; frontend is UX only.

## Migration 0054 Changes

### New Helper Function
- `public.current_user_has_report_permission(p_company_id, p_permission_key)` — checks if the current user has a specific permission key for a company via the role chain

### RLS Hardening
- Dropped 9 permissive write policies (`*_auth_insert`, `*_auth_update`, `*_auth_delete`)
- Created 9 owner/admin-only write policies (`*_owner_insert`, `*_owner_update`, `*_owner_delete`)
- All write policies require `app.current_user_has_tenant_role(company_id, array['owner','admin'])`

### RPC Security Gates

| RPC | Security Gate |
|-----|---------------|
| `erp_list_reports` | `view_reports` permission + doctype read permission |
| `erp_get_report_definition` | `view_reports` permission + doctype read permission + permlevel column filtering |
| `erp_run_report` | `view_reports` permission + doctype read permission + permlevel column filtering + `in` operator |
| `erp_create_report` | owner/admin role + doctype read permission |
| `erp_update_report` | owner/admin role + standard report protection |
| `erp_delete_report` | owner/admin role + standard report protection |

### Doctype Actions Seeding
Seeded `erp_doctype_actions` for all registered DocTypes:
- crm_lead, crm_opportunity, crm_account, crm_contact, crm_followup_task
- product, vehicle, warehouse, store, purchase_invoice, Supplier

### GRANT EXECUTE
All 7 functions explicitly granted to `authenticated` role.

## Security Properties

1. **No permission bypass**: All report operations require appropriate permissions
2. **No column leakage**: Restricted columns are filtered from metadata and results
3. **No company leakage**: Cross-company access is blocked
4. **Standard report protection**: Standard reports cannot be modified or deleted
5. **Field masking**: Fields above user's read permlevel are masked in results
6. **Record-level filtering**: User permissions filter records before display

## Verification

- Cloud: 27/27 PASS (structural + RPC + security checks)
- Browser: 16/16 PASS (UI functionality + no regressions)
- Local: typecheck/lint/test/build all PASS (77/77 tests)
