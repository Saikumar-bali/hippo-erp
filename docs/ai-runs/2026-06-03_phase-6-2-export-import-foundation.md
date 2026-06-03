# AI Run — Phase 6.2 Export/Import Foundation

Date: 2026-06-03
Branch: `phase-2.5-metadata-engine`

## Task Summary

1. Create permission model with export/import keys for CRM Lead and Opportunity
2. Implement CSV export from list-view columns
3. Add Export CSV button to DynamicListPage
4. Implement CSV template generation
5. Implement CSV import with preview, validation, and create-only execution
6. Wire buttons only for metadata-driven DocTypes
7. Browser verify CRM Lead and Opportunity
8. Write tests
9. Run typecheck/lint/test/build/simulation
10. Push to branch

## Permission Model

Added migration `0044_export_import_permissions.sql` that:
- Inserts `export_crm_lead`, `import_crm_lead`, `export_crm_opportunity`, `import_crm_opportunity` into `app.permissions`
- Grants to `owner` and `admin` system roles via `app.role_permission_grants`
- Grants to tenant-level `owner` and `admin` company roles via `app.company_role_permissions`

## Files Created

| File | Lines |
|------|-------|
| `supabase/migrations/0044_export_import_permissions.sql` | Permission seeding |
| `src/lib/export-import/csv-export.ts` | CSV export (RFC 4180) |
| `src/lib/export-import/csv-template.ts` | Template generation |
| `src/lib/export-import/csv-parse.ts` | CSV parser (quoted fields, newlines) |
| `src/lib/export-import/import-validate.ts` | Row-level validation |
| `src/components/import/ImportPreviewDialog.tsx` | Import preview/confirm UI |

## Files Modified

| File | Change |
|------|--------|
| `src/components/metadata/DynamicListPage.tsx` | Export CSV + Import buttons (gated by permissions) |
| `src/components/metadata/DynamicRouteRenderer.tsx` | Pass canExport/canImport to list page |
| `progress.md` | Phase 6.2 entry |

## Key Design Decisions

1. **Export uses client-side data** — exports the current filtered records array, not a server-side RPC. This works for metadata-driven DocTypes where all records are loaded client-side.
2. **Import is create-only** — each valid row calls `api.create()` via `generic-doctype-api.ts`. No update/upsert.
3. **Permissions are seeded in SQL** — migration 0044 adds keys to the permission catalog and grants them. Existing DocType actions system is not modified.
4. **DynamicListPage receives `canExport`/`canImport`** from DynamicRouteRenderer, which derives them from `permissions.can("export_" + doctypeKey)`.

## Verification

Browser verification not yet performed — requires an authenticated owner/admin Supabase session to access CRM pages. The export/import buttons and dialogs should be verified manually:

- CRM Lead list shows Export CSV, Template, Import CSV buttons (gated by `export_crm_lead` / `import_crm_lead`)
- Export CSV downloads a file with list-view columns
- Template download produces a CSV with required-field markers
- Import preview catches missing `lead_name` and invalid Select values
- Import creates one valid row on confirmation
- Same for CRM Opportunity (with numeric/date validation)

## Command Results

```
$ npm run typecheck
→ 0 errors

$ npm run lint
→ 0 errors, warnings only (pre-existing)

$ npm run test
→ 56 pass, 0 fail (50 existing + 6 new export-import tests)

$ npm run build
→ Success (Vite chunk-size warning only)

$ npm run test:simulation
→ All 12 simulation files found
```

## Remaining Gaps

- No export for transaction/GRN custom pages
- Import is create-only (no update/upsert)
- No batch-size limits on import
- No duplicate detection during import
- No import rollback if some rows fail
- Permission keys for other DocTypes (e.g., `export_crm_account`) are not yet seeded — only Lead and Opportunity as proof
