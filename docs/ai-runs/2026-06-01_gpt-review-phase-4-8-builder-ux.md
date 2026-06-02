# GPT Review Report: Phase 4.8 Metadata Studio Builder UX

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commit

- `6259c72e1337421f06084c00462bfbee2a86d483` — Polish metadata studio builder UI

## Files Reviewed

- `docs/ai-runs/2026-06-01_phase-4-8-metadata-studio-builder-ux.md`
- `src/components/metadata-studio/MetadataStudioHome.tsx`
- `src/components/metadata-studio/DocTypeBuilder.tsx`
- `src/components/metadata-studio/DocFieldBuilder.tsx`
- `src/components/metadata-studio/ListViewBuilder.tsx`
- `src/components/metadata-studio/FormLayoutBuilder.tsx`
- `src/components/metadata-studio/WorkspaceMenuBuilder.tsx`
- `src/components/metadata-studio/AccessBuilder.tsx`
- `src/components/metadata/DynamicRouteRenderer.tsx`
- `src/styles.css`
- `tasks.md`

## Review Result

Phase 4.8 is accepted as a major improvement.

The Developer Studio is now builder-first instead of raw-table-first. This directly addresses the user's main complaint: normal metadata work no longer requires manually typing schema names, field type strings, list-view JSON, form-layout JSON, or menu target strings.

## What Is Good

### Builder-first home

`MetadataStudioHome` now clearly separates Builder Screens from Advanced Metadata Tables. The recommended flow is visible and easier to understand.

### DocType Builder

`DocTypeBuilder` provides guided fields for label, key, module, schema, storage strategy, company scope, and description. Defaults are correct for custom metadata DocTypes:

- schema: `app`
- storage: `generic_json`

### Field Builder

`DocFieldBuilder` provides field type dropdowns and context-specific inputs for Select and Link fields. This solves the manual `fieldtype` typing problem.

### List View Builder

`ListViewBuilder` lets the developer pick available fields, selected columns, search fields, filter fields, and preview the list. It writes generated list metadata rather than asking the user to hand-write JSON.

### Form Layout Builder

`FormLayoutBuilder` lets the developer create sections, choose one/two columns, assign fields, reorder fields, and preview the form. It writes generated layout metadata.

### Workspace Menu Builder

`WorkspaceMenuBuilder` uses dropdowns for workspaces, item type, DocType targets, and known page targets. It also auto-suggests the read permission for DocType menu items.

### Access Builder

`AccessBuilder` can create action mappings, missing access keys, and owner/admin grants for common DocType permissions.

## Remaining Gaps

### 1. Final commit is still pending in the Phase 4.8 report

The run report says `Final Commit: Pending next commit.` It should be updated to the actual final commit.

### 2. Backend banner error remains during Purchase Invoice edit

The Phase 4.8 run report says the Purchase Invoice edit form still shows this backend error banner:

```text
function row_to_jsonb(record) does not exist
```

Even if the update persists, this is not acceptable for the next milestone. It should be fixed before starting Purchase Orders or CRM.

### 3. Browser screenshots were local-only

Screenshots were captured locally but not committed. That is acceptable for development, but the next validation phase should either commit screenshots or explicitly keep local-only evidence.

### 4. Builder flow is better, but not a complete publish wizard yet

The builders exist as separate screens. A future flow should connect them into one guided wizard:

```text
DocType → Fields → List View → Form Layout → Menu → Access → Publish Check
```

## Decision

Proceed to Phase 4.9: Builder UX hardening and generic document error cleanup.

Do not start Purchase Orders or CRM yet.

## Required Next Work

Phase 4.9 should:

1. Fix the `row_to_jsonb(record)` backend banner.
2. Update Phase 4.8 final commit in the run report.
3. Add a clear Publish Checklist path from the builder screens.
4. Add committed or clearly documented screenshot evidence.
5. Improve empty states and first-time guidance for each builder.
6. Re-run Purchase Invoice demo browser flow.
