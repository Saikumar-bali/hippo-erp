# GPT Review Report: Phase 4.7 Manual App Builder + Permission Repair

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commit

- `3afc7f44b205353ec62fb8a1c138f9e97f65f831` — Mark completed Phase 4.7 tasks in tasks.md checklist

## Files Reviewed

- `tasks.md`
- `src/components/metadata-studio/MetadataStudioHome.tsx`
- `src/components/metadata-studio/DocTypeCompletionChecklist.tsx`
- `src/components/metadata-studio/DocTypeList.tsx`
- `src/components/metadata-studio/DocFieldList.tsx`
- `src/components/metadata-studio/MetadataFormDialog.tsx`
- `src/components/metadata/DynamicRouteRenderer.tsx`

## Review Result

Phase 4.7 is useful but not enough. It adds a repair/checklist capability, but it does not solve the larger Developer Studio UX problem.

The user is correct: the system still does not feel like a professional app-builder experience. A developer still has to understand raw metadata tables, internal schema names, raw field-type strings, and JSON fields for list views/form layouts.

## What Is Good

- `DocTypeCompletionChecklist` exists and can diagnose missing metadata pieces.
- Metadata Studio now has a visible `Check / Repair DocType` entry.
- The dynamic route renderer can open the completion checklist.
- Repair actions exist for some missing metadata pieces.
- The manual Purchase Invoice and CRM documentation direction is correct.

## What Is Still Wrong

### 1. Raw tables are still the primary editing UI

`DocTypeList` and `DocFieldList` are thin wrappers over `MetadataDataTable`. That means users are editing critical framework objects through generic rows, not through a real builder.

### 2. Schema name should not be manual text

DocType `schema_name` should be a dropdown/segmented choice with explanation:

- `app` = framework/application metadata
- `wh` = warehouse/inventory physical data

For normal custom DocTypes, default to `app` and place low-level schema options under Advanced Settings.

### 3. Field Type should not be manual text

DocFields should use a dropdown with supported field types. Field type selection should reveal contextual options:

- Select → options editor
- Link → linked DocType picker plus display field/template
- Check → default true/false
- Number → precision/min/max later
- Date/Datetime → no free typing required

### 4. List View should not require raw JSON

List View needs a visual column builder:

- available fields on left
- selected columns on right
- width input/dropdown
- reorder buttons or drag-and-drop
- search fields selector
- filter fields selector
- preview table

The JSON editor should remain available only in Advanced mode.

### 5. Form Layout should not require raw JSON

Form Layout needs a visual section builder:

- add section
- choose one/two columns
- assign fields to section
- reorder fields
- preview form

Raw JSON should be advanced-only.

### 6. Workspace Item should not require raw target typing

Workspace item builder should choose:

- Item Type: DocType / Page / Report
- Target: dropdown of DocTypes or known pages depending on item type
- Required Permission: auto-suggest `view_<doctype_key>` for DocTypes

### 7. Phase 4.7 report issue

`tasks.md` says the AI run report was created as `docs/AI_SUMMARY.md` but that file is likely ignored by the repository ignore pattern. The required report path was not found:

`docs/ai-runs/2026-06-01_phase-4-7-manual-app-builder-permission-repair.md`

This must be fixed.

## Decision

Do not move to Purchase Orders yet.

Proceed to Phase 4.8: Professional Metadata Studio UX Overhaul.

This phase should replace raw metadata editing with builder-style screens:

1. DocType Builder
2. Field Builder
3. List View Builder
4. Form Layout Builder
5. Workspace/Menu Builder
6. Permission Builder
7. Preview + Publish Checklist

Raw tables should still exist, but under an Advanced Metadata Tables section only.

## Expected UX Direction

Normal developer flow should be:

```text
Metadata Studio → App Builder → New DocType
1. Basic Info
2. Fields
3. List View
4. Form Layout
5. Permissions
6. Menu
7. Preview & Publish
```

A user should not need to manually type schema names, field types, JSON layout, JSON list columns, permissions, and workspace target strings for a normal custom DocType.
