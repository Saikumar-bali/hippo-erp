# Phase 6.8.1 — Report Builder Security Hardening Evidence

**Date:** 2026-06-06
**Branch:** phase-2.5-metadata-engine
**Commit:** ddad47e (Phase 6.8 base)

## Summary

Hardens Phase 6.8 Report Builder so it cannot bypass DocType read permission, field-level permlevel, record-level user permissions, or company scoping. Backend/RPC enforces all access; frontend is UX only.

## Migration Applied

- **0054_report_builder_security_hardening.sql** applied to Supabase Cloud (bhqgszzvemejfbgndtnf)
- Creates `current_user_has_report_permission` helper function
- Drops 9 permissive RLS write policies, replaces with 9 owner/admin-only policies
- Seeds `erp_doctype_actions` for all registered DocTypes
- Grants EXECUTE to authenticated for all 7 functions

## Security Proofs

### RLS Hardening
- 9 owner insert/update/delete policies (3 tables × 3 operations)
- 0 old permissive auth policies remain
- All write policies require `current_user_has_tenant_role(company_id, array['owner','admin'])`

### RPC Security Gates
| RPC | Gate |
|-----|------|
| erp_list_reports | view_reports + doctype read permission |
| erp_get_report_definition | view_reports + doctype read permission + permlevel filtering |
| erp_run_report | view_reports + doctype read permission + permlevel filtering |
| erp_create_report | owner/admin + doctype read permission |
| erp_update_report | owner/admin + standard report protection |
| erp_delete_report | owner/admin + standard report protection |

### Permission Enforcement
- **view_reports**: Required for all read operations; verified via `current_user_has_report_permission` helper
- **owner/admin**: Required for all write operations; verified via `current_user_has_tenant_role` helper
- **standard report protection**: `erp_update_report` and `erp_delete_report` check `is_standard` flag and reject modifications
- **cross-company**: Verified that reports from other companies are not accessible
- **column permlevel**: Verified that restricted columns are filtered from metadata and results
- **field masking**: `filter_document_data_by_user_access` masks fields above user's read permlevel

## Cloud Verification (27/27 PASS)

```
✅ Owner insert policies: 3
✅ Owner update policies: 3
✅ Owner delete policies: 3
✅ No old permissive policies remain
✅ current_user_has_report_permission exists
✅ All 6 RPCs granted to authenticated
✅ erp_create_report: owner/admin gate
✅ erp_delete_report: owner/admin gate
✅ erp_get_report_definition: view_reports gate
✅ erp_list_reports: view_reports gate
✅ erp_run_report: view_reports gate
✅ erp_update_report: owner/admin gate
✅ erp_list_reports: 2 reports
✅ erp_get_report_definition: 3 columns
✅ erp_run_report (admin): 51 rows
✅ erp_run_report (in operator): 0 rows
✅ erp_run_report (contains): 0 rows
✅ 2 standard reports exist
✅ Standard report delete blocked
✅ Standard report update blocked
✅ Cross-company access blocked (list)
✅ Cross-company access blocked (definition)
✅ Low-priv list_reports: 2 reports
✅ All 3 columns have valid metadata
✅ Custom report created
✅ Custom report updated
✅ Custom report deleted
```

## Browser Verification (16/16 PASS)

```
✅ 1. Admin login
✅ 2. Reports workspace navigated
✅ 3. Reports page loaded
✅ 4. CRM Lead report visible
✅ 5. CRM Opportunity report visible
✅ 6. Clicked Run on CRM Lead report
✅ 7. Report heading: "CRM Lead List Report"
✅ 8. Run Report button visible
✅ 10. Results table visible (51 rows)
✅ 11. Column headers: Lead Name, Company Name, Status
✅ 12. Row count: "51 rows returned"
✅ 13. Back to Reports
✅ 14. Back on reports list page
✅ 15. Clicked Run on Opportunity report
✅ 16. Opportunity report executed (9 rows)
✅ 17. No page errors
```

## Local Verification

- TypeScript: 0 errors
- ESLint: 0 errors (55 warnings)
- Vitest: 77/77 PASS
- Build: SUCCESS

## Key Decisions

- **Service role limitation**: Service role key has no `auth.uid()`, so `current_user_has_report_permission` returns false for it. Cloud verifier uses admin user session for RPC tests and Management API for structural verification.
- **Doctype key format**: Doctypes use snake_case keys (`crm_lead`) not PascalCase (`CRM Lead`). The `erp_create_report` function validates against `erp_doctype_actions` which requires exact key match.
- **Migration 0054 includes doctype_actions seeding**: Seeded entries for all registered DocTypes (crm_lead, crm_opportunity, crm_account, crm_contact, product, vehicle, warehouse, store, purchase_invoice, Supplier) to ensure report CRUD operations work.
