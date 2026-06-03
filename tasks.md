# Phase 6.2 Tasks: Export / Import Foundation

Active branch: `phase-2.5-metadata-engine`

Goal: add safe, permission-controlled CSV export/import for metadata-driven DocTypes. Start with CRM Lead and Opportunity as the proof. Do not start Purchase Orders, Print Format Builder, Client Scripts, Report Builder, or Workflow yet.

## Current status

Phase 6.1 and 6.1.1 are accepted:

- Theme Studio foundation exists
- company branding settings save/load path is implemented
- app shell applies company theme safely
- local visual QA passed
- theme test stderr was cleaned up
- `npm run test` is clean with 50/50 passing

## Why this phase exists

ERP users need to move data in and out of the system:

- export lists for Excel review
- export filtered records
- download import templates
- validate CSV before import
- see row-level import errors

This must be permission-controlled. Users should not export/import data unless their role allows it.

---

## A. Docs

- [x] GPT review: `docs/ai-runs/2026-06-03_gpt-review-phase-6-1-1-theme-qa.md`
- [ ] Create `docs/PHASE_6_2_EXPORT_IMPORT_FOUNDATION.md`
- [ ] Create `docs/ai-runs/2026-06-03_phase-6-2-export-import-foundation.md`
- [ ] Update `progress.md`

---

## B. Permission model

Add/verify permission actions:

- [ ] export
- [ ] import

For generic metadata DocTypes, permission keys should follow:

- [ ] `export_<doctype_key>`
- [ ] `import_<doctype_key>`

Seed or repair for CRM proof DocTypes:

- [ ] `export_crm_lead`
- [ ] `import_crm_lead`
- [ ] `export_crm_opportunity`
- [ ] `import_crm_opportunity`

Grant to owner/admin by default.

Update Access Control Manager if needed so export/import rights appear in the matrix.

---

## C. Export foundation

Create frontend utility:

- [ ] `src/lib/export-import/csv-export.ts`

Required behavior:

- [ ] export current list records to CSV
- [ ] use visible/list-view columns by default
- [ ] preserve column labels
- [ ] escape commas, quotes, and newlines correctly
- [ ] include filtered/current result set, not hidden stale records
- [ ] filename format: `<doctype_key>_<YYYY-MM-DD>.csv`

Add UI:

- [ ] Export CSV button in `DynamicListPage` for metadata-driven DocTypes
- [ ] button visible only when user has `export_<doctype_key>` permission
- [ ] friendly disabled/hidden behavior when permission is missing
- [ ] no export button for transaction pages unless explicitly implemented later

---

## D. Import template foundation

Create frontend utility:

- [ ] `src/lib/export-import/csv-template.ts`

Required behavior:

- [ ] generate CSV template from DocFields
- [ ] include visible/editable fields
- [ ] include required columns
- [ ] optional second row with field hints if practical
- [ ] filename format: `<doctype_key>_template.csv`

Add UI:

- [ ] Download Template button in DynamicListPage or import dialog
- [ ] visible only with `import_<doctype_key>` permission

---

## E. Import preview foundation

Create:

- [ ] `src/components/import/ImportPreviewDialog.tsx`
- [ ] `src/lib/export-import/csv-parse.ts`
- [ ] `src/lib/export-import/import-validate.ts`

Required behavior:

- [ ] upload/paste CSV file
- [ ] parse CSV safely
- [ ] map headers to DocFields
- [ ] validate required fields
- [ ] validate field types for Data/Text/Int/Float/Check/Select/Date/Datetime
- [ ] validate Select values against options
- [ ] show preview rows
- [ ] show row-level errors
- [ ] do not write records until user confirms

Implementation scope:

- [ ] preview/validation first
- [ ] actual insert/update can be limited to create-only generic_json records if safe
- [ ] if write is deferred, document clearly

---

## F. Import execution for generic_json DocTypes

If safe within this phase, implement create-only import:

- [ ] use existing generic document API
- [ ] create one record per valid row
- [ ] stop or skip invalid rows with clear result
- [ ] show success/failure summary

Rules:

- [ ] enforce `import_<doctype_key>` permission before import UI/write
- [ ] do not import into GRN or physical transaction pages
- [ ] do not bypass generic document validation

---

## G. CRM verification

Browser verify with CRM Lead:

- [ ] export Lead list to CSV
- [ ] CSV includes visible columns and labels
- [ ] download Lead template
- [ ] import preview catches missing required `lead_name`
- [ ] import preview validates Select values for `source` and `status`
- [ ] if create import is implemented, import one valid Lead row

Browser verify with CRM Opportunity:

- [ ] export Opportunity list to CSV
- [ ] CSV includes visible columns and labels
- [ ] download Opportunity template
- [ ] import preview validates numeric/date fields

---

## H. Tests

Add/update tests:

- [ ] CSV export escaping
- [ ] CSV parse with quotes/newlines
- [ ] template generation from DocFields
- [ ] import validation required field
- [ ] import validation Select field
- [ ] permission visibility for export/import buttons if practical

---

## I. Commands

Run and document:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

---

## J. Acceptance

Phase 6.2 is complete only when:

- [ ] export/import permission keys are supported
- [ ] export CSV works for CRM Lead and Opportunity
- [ ] template download works
- [ ] import preview validates rows and shows clear errors
- [ ] create-only import works or is explicitly deferred with reason
- [ ] export/import buttons respect permissions
- [ ] browser verification is documented
- [ ] tests cover CSV utilities and validation
- [ ] AI run report exists

After Phase 6.2, recommended next phase:

- Phase 6.3: Print Format Foundation
