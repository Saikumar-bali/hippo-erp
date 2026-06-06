# Phase 6.8: Report Builder Foundation

**Status:** Complete  
**Date:** 2026-06-06  
**Commits:** Pending  

## What was built

Metadata-driven Report Builder for generic_json DocTypes using CRM Lead and CRM Opportunity as proof DocTypes. Backend/RPC enforces all access; frontend is UX only.

## Architecture

### Database (Migration 0053)

**Tables:**
- `app.erp_reports` — Report definitions (company-scoped, report_key unique per company)
- `app.erp_report_columns` — Column definitions (fieldname, label, fieldtype, width, aggregation)
- `app.erp_report_filters` — Filter definitions (fieldname, operator, default_value, is_required)

**RLS Policies:** Service role bypass, authenticated read via company membership, authenticated insert/update/delete (enforced by RPC).

**Seed Reports:**
- CRM Lead List Report — 6 columns (lead_name, company_name, status, workflow_state, docstatus, created_at), 3 filters
- CRM Opportunity List Report — 7 columns (opportunity_name, account_name, stage, amount, workflow_state, docstatus, created_at), 2 filters

**Workspace:** Reports workspace activated with home page item + 2 report items.

**Permission Grants:** `view_reports` and `export_reports` granted to Owner, Admin, Warehouse Manager, Stock Operator, Viewer, Auditor roles.

### Backend RPCs

| RPC | Purpose |
|-----|---------|
| `erp_list_reports(p_company_id)` | List available reports for company (respects DocType read permission) |
| `erp_get_report_definition(p_report_id, p_company_id)` | Get report with columns and filters |
| `erp_run_report(p_report_id, p_company_id, p_filters)` | Execute report with full security enforcement |
| `erp_create_report(...)` | Create custom report |
| `erp_update_report(...)` | Update custom report (not standard) |
| `erp_delete_report(...)` | Soft-delete custom report (not standard) |

### Security Model (erp_run_report)

1. **DocType read permission** — `current_user_has_doctype_permission(doctype_key, 'read', company_id)`
2. **Record-level permissions** — `document_matches_user_permission_rules(user_id, company_id, doctype_key, data, 'read')`
3. **Field-level masking** — `filter_document_data_by_user_access(user_id, company_id, doctype_key, data)`
4. **User filters applied AFTER permission filtering** — prevents filter-based permission bypass
5. **Only report-defined columns returned** — even if user has read access to more fields

### Frontend Components

- `src/lib/reports-api.ts` — API wrappers including `resolveReportId()` for report_key→UUID resolution
- `src/components/reports/ReportsPage.tsx` — List available reports with internal navigation to ReportRunner
- `src/components/reports/ReportRunner.tsx` — Report execution with filter UI and results table
- `src/components/metadata/DynamicRouteRenderer.tsx` — Routes to ReportsPage (reports_home) or ReportRunner (report items)

## Key fixes during implementation

1. **erp_run_report SQL bug**: Original had broken `order by ' || format('%L', 'created_at') || ' desc` concatenation creating unterminated string literals. Fixed to use single `format()` call with `%s` for dynamic parts.

2. **report_key vs UUID**: Workspace items store `report_key` (string) as target, but RPCs expect UUID. Added `resolveReportId()` that lists reports and finds matching key.

3. **Reports home page**: Added `reports_home` page item to Reports workspace so sidebar navigation shows full reports list.

## Verification

- **Cloud:** 16/16 PASS (tables, seed data, columns, filters, workspace items, permission grants, RPCs exist)
- **Browser:** 13/13 PASS (login, sidebar, reports page, report list, report runner, execute, results, back navigation, no errors)
- **TypeScript:** Clean (no errors)
- **Lint:** Clean (no errors)
- **Build:** Successful
- **Tests:** 77/77 PASS
