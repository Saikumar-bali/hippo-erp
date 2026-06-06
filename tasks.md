# Phase 6.8 Tasks: Report Builder Foundation

Status: COMPLETE

## Why this gate exists

Adds Frappe-like Report Builder foundation for metadata-driven DocTypes. Uses CRM Lead and CRM Opportunity as proof DocTypes. Backend/RPC enforces all access; frontend is UX only.

## Deferred

- Module Builder — separate workspace, not part of this phase
- Purchase Orders — business module, not started
- Purchase Invoice — business module, not started
- Fleet — business module, not started
- Client Scripts — not started
- PDF generation — not started

## Tasks

### 1. Database migration (0053_report_builder_foundation.sql)
- [x] Create `app.erp_reports` table (id, company_id, report_key, report_name, doctype_key, report_type, is_standard, is_active, created_by, created_at, updated_at)
- [x] Create `app.erp_report_columns` table (report_id, fieldname, label, fieldtype, order_index, width, is_visible, aggregation)
- [x] Create `app.erp_report_filters` table (report_id, fieldname, operator, default_value, is_required, order_index)
- [x] RLS policies on all report tables
- [x] Seed CRM Lead List Report (standard)
- [x] Seed CRM Opportunity List Report (standard)
- [x] Activate Reports workspace and add CRM report workspace items
- [x] Add `view_reports` and `export_reports` permission grants to owner/admin roles
- [x] Add `reports_home` workspace item for report list page

### 2. Backend RPCs
- [x] `erp_list_reports(p_company_id)` — list reports for company
- [x] `erp_get_report_definition(p_report_id, p_company_id)` — get report definition with columns and filters
- [x] `erp_run_report(p_report_id, p_company_id, p_filters)` — execute report with full security
- [x] `erp_create_report(p_company_id, p_report_key, p_report_name, p_doctype_key, ...)` — create custom report
- [x] `erp_update_report(p_report_id, p_company_id, ...)` — update custom report
- [x] `erp_delete_report(p_report_id, p_company_id)` — soft-delete custom report (not standard)

### 3. Frontend
- [x] `src/lib/reports-api.ts` — API wrappers for report RPCs (including resolveReportId)
- [x] `src/components/reports/ReportsPage.tsx` — list available reports with internal navigation
- [x] `src/components/reports/ReportRunner.tsx` — run report with filters and show results
- [x] Update `DynamicRouteRenderer.tsx` to render ReportRunner for `item_type === "report"` and ReportsPage for `reports_home`

### 4. Security checks
- [x] Report execution checks DocType read permission (via erp_run_report RPC)
- [x] Report execution applies record-level user permissions (document_matches_user_permission_rules)
- [x] Report execution masks/omits fields above user's read permlevel (filter_document_data_by_user_access)
- [x] Filters cannot bypass user permissions (applied AFTER permission filtering)
- [x] Columns cannot expose hidden/unauthorized fields (only report-defined + masked columns)
- [x] CRM Opportunity report works

### 5. Verification
- [x] `scripts/verify_phase6_8_report_builder_cloud.mjs` — cloud proof (16/16 PASS)
- [x] `scripts/verify_phase6_8_report_builder_browser.mjs` — browser proof (13/13 PASS)
- [x] Run full command set (typecheck, lint, test, build, test:simulation, provision, cloud, browser)
- [ ] Create docs (PHASE_6_8_REPORT_BUILDER_FOUNDATION.md, ai-runs doc)
- [x] Update tasks.md, progress.md with results

### 6. Final
- [ ] Final commit and push to phase-2.5-metadata-engine

## Key fixes during implementation

- **erp_run_report bug**: Original SQL had broken `order by ' || format('%L', 'created_at') || ' desc` concatenation that created unterminated string literals. Fixed to use single `format()` call with `%s` for WHERE and ORDER BY clauses.
- **report_key vs UUID**: Workspace items store `report_key` (string) as target, but RPCs expect UUID. Added `resolveReportId()` helper that resolves keys to UUIDs via `listReports()`.
- **Reports home page**: Added `reports_home` page item to Reports workspace so users can see the full reports list before drilling into individual reports.

---

# Phase 6.8.1 Tasks: Report Builder Security Hardening

Status: COMPLETE

## Why this gate exists

Hardens Phase 6.8 Report Builder so it cannot bypass DocType read permission, field-level permlevel, record-level user permissions, workflow/docstatus restrictions, audit/version security, or company scoping. Backend/RPC enforces all access; frontend is UX only.

## Tasks

### 1. Database migration (0054_report_builder_security_hardening.sql)
- [x] Create `public.current_user_has_report_permission` helper function
- [x] Harden RLS: drop permissive write policies, replace with owner/admin-only policies
- [x] Seed `app.erp_doctype_actions` for report CRUD permission checks
- [x] GRANT EXECUTE to authenticated for all 7 functions

### 2. RPC hardening
- [x] `erp_list_reports`: add `view_reports` gate + doctype read permission check
- [x] `erp_get_report_definition`: add `view_reports` gate + doctype read permission check + permlevel column filtering
- [x] `erp_run_report`: add `view_reports` gate + doctype read permission check + `in` operator + permlevel column filtering
- [x] `erp_create_report`: add owner/admin gate + doctype read permission check
- [x] `erp_update_report`: add owner/admin gate + standard report protection
- [x] `erp_delete_report`: add owner/admin gate + standard report protection

### 3. Verification
- [x] `scripts/verify_phase6_8_1_report_security_cloud.mjs` — cloud proof (27/27 PASS)
- [x] `scripts/verify_phase6_8_1_report_security_browser.mjs` — browser proof (16/16 PASS)
- [x] Run full command set (typecheck, lint, test, build — 77/77 PASS)

### 4. Final
- [ ] Final commit and push to phase-2.5-metadata-engine
