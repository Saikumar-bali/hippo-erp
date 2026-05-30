# GPT Review Report: Phase 2.9 Custom DocType Wizard

## Goal

Review the pushed Phase 2.9 Custom DocType Wizard implementation and decide whether the project should proceed to Warehouse or run a cleanup phase first.

## Branch

`phase-2.5-metadata-engine`

## Files Inspected

- `progress.md`
- `tasks.md`
- `docs/ai-runs/2026-05-30_phase-2-9-custom-doctype-wizard.md`
- `src/components/metadata-studio/CustomDocTypeWizard.tsx`
- `src/lib/metadata/metadata-studio-api.ts`
- `src/components/metadata/doctype-api-map.ts`
- `src/lib/metadata/generic-doctype-api.ts`
- `src/components/metadata/DynamicListPage.tsx`
- `tests/simulations/custom_doctype_wizard_flow.sql`

## Review Summary

Phase 2.9 is a major UX improvement. The project now has a guided Custom DocType Wizard, which is much closer to a Frappe-like developer side than raw metadata table editing.

However, the project should not jump to Warehouse yet. The wizard still has several gaps that affect real end-to-end custom DocType usability.

## What Is Good

- Metadata Studio now has a primary `Create Custom DocType` action.
- The wizard understands that a working DocType needs DocType, DocFields, List View, Form Layout, DocType Actions, Workspace Item, and `generic_json` storage.
- The wizard creates metadata in the correct dependency order.
- Raw metadata tables are now secondary/advanced, which is better UX.
- Simulation verifies metadata bundle creation and rollback.
- The system has a generic JSON storage path for custom DocTypes.

## Key Remaining Problems

### 1. Permission keys are mapped but not created

The wizard may generate keys like `view_supplier`, `create_supplier`, `update_supplier`, and `delete_supplier`, but those permissions are not automatically inserted into the permission catalog or assigned to roles.

Result: the sidebar item may be created, but the current user may not see it or may not be able to create documents.

### 2. Real authenticated CRUD is not fully verified

The run report says SQL Editor cannot simulate a real user auth context for document CRUD. That is acceptable as a limitation, but it means the custom DocType is not fully proven end-to-end from UI.

### 3. Duplicate DocType key detection is weak

The wizard relies mostly on Supabase constraints instead of checking before submit and showing a friendly error.

### 4. Sidebar refresh may need manual reload

The wizard should refresh workspace navigation automatically after creating the Workspace Item, or show a clear reload/open action.

### 5. Created custom DocType needs a completion checklist

After creation, the user should see a checklist:

- metadata created
- permissions created/granted
- workspace item created
- screen available
- first record created

### 6. Naming series and workflow remain absent

This is acceptable for now, but the UI should clearly mark them as optional future steps.

## UI Review

### Metadata Studio

Much better. The wizard should be the main path, and raw metadata tables should remain under Advanced Metadata Tables.

### Wizard

Good direction. It should be treated as a first version, not final.

Needs improvement:

- clearer permission step
- duplicate key check
- auto-refresh/open created DocType
- final success checklist
- real UI smoke test documented with screenshot or steps

### Enterprise UX

The compact UI direction is correct. Keep avoiding oversized cards and marketing-style spacing.

## Recommendation

Do not start Warehouse yet.

Start Phase 2.10: Custom DocType Wizard Hardening.

This phase should make the wizard actually reliable for real users before building Warehouse.

## Phase 2.10 Acceptance Direction

Phase 2.10 should complete these before Warehouse:

1. Auto-create or explicitly map permission catalog records for custom DocTypes.
2. Grant generated permissions to owner/admin roles or provide a clear role assignment step.
3. Check duplicate DocType keys before submit.
4. Refresh navigation after creation.
5. Add a final completion checklist.
6. Verify with a real authenticated UI flow on Supabase Cloud:
   - create custom DocType
   - see it in sidebar
   - open it
   - create one record
   - list it
   - edit it
   - deactivate it
7. Add an AI run report for the cleanup.

## Next Recommended Task

Phase 2.10: Custom DocType Wizard Hardening And Real UI Verification.
