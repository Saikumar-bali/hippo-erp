# GPT Review Report: Phase 2.8 Custom DocType Storage And UI Direction

## Goal

Review the current pushed implementation after CLI-AI completed Custom DocType Document Storage and provide a clear next task direction for the Developer Side / Metadata Studio.

## Branch And Commit

- Branch: `phase-2.5-metadata-engine`
- Review date: 2026-05-30
- Reviewer: GPT-5.5

## Files Inspected

- `progress.md`
- `tasks.md`
- `src/components/metadata/DynamicListPage.tsx`
- `src/components/metadata/DynamicDetailPage.tsx`
- `src/components/metadata/doctype-api-map.ts`
- `src/lib/metadata/generic-doctype-api.ts`
- `src/lib/metadata/metadata-studio-api.ts`
- `src/components/metadata-studio/MetadataStudioHome.tsx`
- `src/components/metadata-studio/MetadataDataTable.tsx`
- `src/components/metadata-studio/DocTypeList.tsx`
- `docs/PHASE_2_7_METADATA_STUDIO.md`

## Review Summary

Phase 2.8 is a strong architectural step. The project now has a generic JSON document storage path for custom DocTypes. This is the correct safe alternative to creating physical database tables from UI.

The main problem is UX: Metadata Studio currently exposes raw metadata tables. This is useful for developers, but not enough for a Frappe-like builder experience. Users can create a DocType row, but they do not get guided through DocFields, List View, Form Layout, DocType Actions, Workspace Item, and storage configuration.

## What Works

- `storage_strategy` exists on DocType metadata.
- Existing physical Product Master DocTypes can continue to use `physical_rpc`.
- Custom DocTypes can use `generic_json`.
- `doctype-api-map.ts` can auto-detect generic JSON DocTypes and register generic API handlers.
- `generic-doctype-api.ts` wraps generic document RPC calls.
- Metadata Studio exposes raw metadata tables for inspection and advanced admin editing.
- Supabase Cloud verification is documented in `progress.md`.

## Key Gap

Creating a DocType row alone is not a complete app screen.

A usable custom DocType requires:

1. DocType
2. DocFields
3. List View
4. Form Layout
5. DocType Actions
6. Workspace Item
7. Storage strategy / data API

Currently the user must manually know and create all of these pieces. That is too raw and not professional enough.

## UI Review

### Density

The compact density is improved compared with earlier screenshots. Keep this direction.

### Navigation

The sidebar grouping is much better. Product Master and Metadata Studio are clearer than the previous flat module list.

### Metadata Studio

Current Metadata Studio still looks like a database admin table. For a framework-like product, it needs a primary guided flow:

- Create Custom DocType Wizard
- Metadata completeness checklist
- Preview generated sidebar item
- Preview generated list view
- Preview generated form layout

Raw metadata tables should remain, but under an "Advanced Metadata Tables" section.

### Tables

Tables are compact and readable, but large metadata tables need:

- search
- filter by DocType
- pagination
- column visibility
- sticky header
- friendlier labels for JSON fields

### Forms

The current generic metadata forms are too raw. They need helper text and generated defaults.

Example:

- Label: Supplier
- Generated key: supplier
- Storage: generic_json
- Route: /suppliers

### Empty And Error States

DynamicListPage now gives a better message for DocTypes with no data API. This is important and should remain.

## Architecture Risk

The project should not proceed to Warehouse until custom DocType creation is guided and testable end-to-end.

If Warehouse starts now, the project will likely return to hardcoded patterns.

## Recommended Next Task

Start Phase 2.9: Custom DocType Wizard UX.

The wizard should create all required metadata for a working `generic_json` custom DocType in one guided flow.

## Required Phase 2.9 Acceptance Criteria

- Metadata Studio has a clear primary action: `Create Custom DocType`.
- Wizard creates DocType, DocFields, List View, Form Layout, DocType Actions, and Workspace Item.
- New custom DocType appears in the selected workspace menu.
- New custom DocType opens with DynamicListPage.
- User can create at least one generic JSON document record.
- Simulation verifies the flow on Supabase Cloud.
- CLI-AI adds a run report in `docs/ai-runs/`.

## Next Recommended Prompt Target

`tasks.md` should move from Phase 2.8 to Phase 2.9 and focus on the wizard, not Warehouse.
