# Phase 6.8 AI Run Evidence — Report Builder Foundation

**Date:** 2026-06-06  
**Phase:** 6.8 Report Builder Foundation  

## Summary

Built metadata-driven Report Builder for generic_json DocTypes. CRM Lead and CRM Opportunity as proof DocTypes. Backend/RPC enforces all access; frontend is UX only.

## Implementation steps

1. **Migration 0053** — Created 3 tables (erp_reports, erp_report_columns, erp_report_filters), RLS policies, seed reports, 6 RPCs, workspace items, permission grants
2. **Frontend** — Created reports-api.ts, ReportsPage.tsx, ReportRunner.tsx; updated DynamicRouteRenderer.tsx
3. **Bug fixes** — Fixed erp_run_report SQL bug (broken order by concatenation), added resolveReportId for report_key→UUID resolution, added reports_home workspace item

## Verification results

### Cloud verification (16/16 PASS)
- erp_reports table exists
- erp_report_columns table exists
- erp_report_filters table exists
- CRM Lead report exists (CRM Lead List Report)
- CRM Opportunity report exists (CRM Opportunity List Report)
- CRM Lead report has 6 columns
- All columns have label, fieldname, fieldtype
- CRM Opportunity report has 7 columns
- CRM Lead report has 3 filters
- CRM Lead workspace item (CRM Lead Report)
- CRM Opportunity workspace item (CRM Opportunity Report)
- Workspace item type is 'report'
- Owner has view_reports
- Admin has view_reports
- Owner has export_reports
- All 6 RPCs exist

### Browser verification (13/13 PASS)
- Admin login
- Reports workspace item found
- Reports page loaded
- CRM Lead report visible
- CRM Opportunity report visible
- Clicked Run on CRM Lead report
- Report heading: "CRM Lead List Report"
- Run Report button visible
- Results table visible (51 rows)
- Row count: "51 rows returned"
- Back to Reports
- Back on reports list page
- No page errors

### Full command set
- TypeScript: Clean (no errors)
- Lint: Clean (no errors)
- Build: Successful
- Tests: 77/77 PASS

## Key decisions

- **erp_run_report SQL fix**: Original used broken `order by ' || format('%L', 'created_at') || ' desc` concatenation. Fixed to use single `format()` call with `%s` for dynamic parts.
- **report_key resolution**: Workspace items store `report_key` (string) as target, RPCs expect UUID. Added `resolveReportId()` that lists reports and matches by key.
- **Reports home page**: Added `reports_home` page item so sidebar shows full reports list before drilling into individual reports.
