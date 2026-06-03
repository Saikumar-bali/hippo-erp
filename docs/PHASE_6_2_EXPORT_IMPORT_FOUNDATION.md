# Phase 6.2 — Export/Import Foundation

## Goal

Add safe, permission-controlled CSV export and import foundation for metadata-driven DocTypes. Use CRM Lead and Opportunity as the proof.

## Scope

This phase adds:
- Permission model with `export_<doctype_key>` / `import_<doctype_key>` keys
- CSV export from list-view columns (current filtered result set)
- CSV template download with editable/required field annotations
- CSV import with preview, validation, and create-only execution
- All wired into DynamicListPage for metadata-driven DocTypes only
- No GRN/transaction custom page export/import

## Permission Model

- `export_crm_lead` / `import_crm_lead`
- `export_crm_opportunity` / `import_crm_opportunity`
- Seeded to permission catalog via migration `0044`
- Granted to `owner` and `admin` system roles and tenant company roles
- Access Control Manager already supports export/import rights via `STANDARD_ACCESS_RIGHTS`

## Export Design

- `csv-export.ts` converts record arrays to CSV string
- Uses visible list-view columns for field selection
- Labels from DocField labels (not raw fieldnames)
- Escapes commas, quotes, and newlines per RFC 4180
- Exports current filtered/current result set (client-side)
- Filename: `<doctype_key>_<YYYY-MM-DD>.csv`
- Button in DynamicListPage header, gated by `permissionChecker("export_<key>")`

## Template Design

- `csv-template.ts` generates a header-row-only CSV from DocFields
- Includes non-hidden, non-readonly, non-system fields
- Marks required columns with `*` prefix in header
- Excludes `id`, `created_at`, `updated_at`, `is_active` system fields
- Filename: `<doctype_key>_template.csv`

## Import Design

- `csv-parse.ts`: RFC 4180 compliant parser (quoted fields, escaped quotes, newlines)
- `import-validate.ts`: Validates each row against DocField metadata
  - Required fields (is_required = true)
  - Type validation: Data, Text, Float, Int, Check, Select, Date, Datetime
  - Select options validation
  - Date/Datetime format validation
  - Float/Int numeric validation
- `ImportPreviewDialog.tsx`: Upload/paste CSV → header mapping → preview rows with errors → confirm import
- Import is create-only: one record per valid row via `generic-doctype-api.ts` `create()` method
- Gated by `permissionChecker("import_<key>")`

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/0044_export_import_permissions.sql` | Permission catalog and grants |
| `src/lib/export-import/csv-export.ts` | CSV export logic |
| `src/lib/export-import/csv-template.ts` | Template generation |
| `src/lib/export-import/csv-parse.ts` | CSV parsing |
| `src/lib/export-import/import-validate.ts` | Row validation |
| `src/components/import/ImportPreviewDialog.tsx` | Import preview UI |

## Files Modified

| File | Change |
|------|--------|
| `src/components/metadata/DynamicListPage.tsx` | Added Export CSV + Import buttons |
| `src/components/metadata/DynamicRouteRenderer.tsx` | Pass `canExport`/`canImport` to list page |
| `progress.md` | Phase 6.2 entry |

## Verification Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors (pre-existing warnings only) |
| `npm run test` | All pass |
| `npm run build` | Success |
| `npm run test:simulation` | All simulation files found |

### Browser Verification

Performed via Playwright against authenticated owner/admin session on `hippoclouds-com` tenant. Migration 0044 was applied to Supabase Cloud before testing.

| Check | Result |
|-------|--------|
| CRM Lead Export CSV button visible | ✅ |
| CRM Lead Template button visible | ✅ |
| CRM Lead Import CSV button visible | ✅ |
| Import catches missing `lead_name` required field | ✅ |
| Import catches invalid Select value | ✅ |
| CRM Opportunity Export CSV button visible | ✅ |
| CRM Opportunity Template button visible | ✅ |
| CRM Opportunity Import CSV button visible | ✅ |

## Remaining Gaps

- No export for transaction/GRN custom pages
- Import is create-only (no update/upsert)
- No batch-size limits on import
- No duplicate detection during import
- No import rollback if some rows fail
