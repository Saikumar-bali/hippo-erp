# GPT Review Report: Phase 2.10 Custom DocType Wizard Hardening

## Goal

Review CLI-AI's Phase 2.10 hardening report and decide whether the project can proceed to Phase 3 Warehouse.

## Branch

`phase-2.5-metadata-engine`

## Files Inspected

- `progress.md`
- `tasks.md`
- `docs/ai-runs/2026-05-30_phase-2-10-custom-doctype-wizard-hardening.md`
- `src/lib/metadata/generic-doctype-api.ts`
- `src/components/metadata/DynamicListPage.tsx`

## Review Summary

Phase 2.10 is accepted with one documentation note.

The run report states that the real browser flow was manually verified on `localhost:5173` and that create, list, view, edit, update, and deactivate worked for `Supplier UI Tests`.

The report also documents fixes for the browser bugs found during testing:

- custom JSON data rendering in list view
- detail/form fallback loading
- deactivate/reactivate company context
- state leakage when switching DocTypes
- status field collision between custom data and system status

## Evidence Reviewed

The Phase 2.10 report states:

- Supabase Cloud migration 0027 applied successfully.
- Supabase Cloud simulation passed all 14 checks.
- Authenticated REST API verification confirmed all 10 CRUD operations.
- Browser flow verified Supplier UI Tests list, create, view, edit, update, and deactivate.

Code inspection confirms:

- `generic-doctype-api.ts` flattens JSON `data` fields into record properties while preserving system fields.
- `DynamicListPage.tsx` now resolves generic APIs into React state, resets stale selected/editing state on DocType change, passes `tenantId` for deactivate/reactivate, and passes `initialRecord` into detail/form flows.

## Documentation Note

The report references screenshot names such as:

- `retest-1-list-before.png`
- `retest-2-form-filled.png`
- `retest-3-list-after-create.png`
- `retest-7-list-final.png`

However, these PNG files were not found in the repository search. For future runs, CLI-AI should commit screenshots under:

```text
docs/ai-runs/screenshots/<phase>/
```

or clearly state that screenshots were captured locally but not committed.

## UI Review

The current UI is compact enough to continue. The Metadata Studio developer-side flow has progressed from raw metadata tables to a working guided wizard.

Remaining UX improvements can continue later:

- better document empty states
- breadcrumb/title polish
- list sorting from `sort_json`
- optional wizard screenshot capture into repo
- role-permission assignment UI for non-admin roles

## Decision

Approved to proceed to Phase 3: Warehouse Hierarchy.

Reason: the framework foundation now supports both sides:

1. ERP User Side — dynamic workspace/sidebar and DynamicListPage records.
2. Developer Side — Metadata Studio and Custom DocType Wizard.

Warehouse should now be built using this metadata-driven pattern, not by returning to hardcoded screens.

## Phase 3 Guardrails

Warehouse is allowed now, but must follow these rules:

- Warehouse master data can use metadata-driven CRUD.
- Do not build GRN or Stock Ledger yet.
- Do not post inventory movements in generic JSON documents.
- Stock-changing actions must later use explicit RPC/service logic.
- Use Supabase Cloud for migration/seed verification.
- Add simulation SQL and AI run report.
