# Phase 2.10 — Custom DocType Wizard Hardening

## Goal

Harden the Phase 2.9 Custom DocType Wizard so a real authenticated user can create a custom DocType, see it in the sidebar, open it, create a record, edit it, and deactivate it.

## Why This Phase Exists

Phase 2.9 created the wizard and generic metadata bundle creation. This phase closes critical gaps before Warehouse begins:

1. Permission keys can be mapped but not created/granted
2. Real authenticated CRUD was not fully verified
3. Duplicate DocType key detection was weak
4. Sidebar refresh after creation required manual reload
5. Final success state lacked a clear completion checklist

## Key Changes

### 1. Transaction-Safe Bundle RPC (Migration 0027)

`public.erp_create_custom_doctype_bundle` is a single SECURITY DEFINER RPC that atomically:
- Checks for duplicate doctype_key and workspace item_key
- Inserts all 6 metadata sets (DocType, DocFields, List View, Form Layout, Actions, Workspace Item)
- Provisions new permission keys in `app.permissions`
- Grants permissions to owner and admin roles

### 2. Duplicate Validation

- Client-side API checks before submission
- RPC also checks and rejects duplicates
- Field-level error messages in the wizard
- Uppercase key rejection

### 3. Permission Handling

- Permission keys are auto-created in the global catalog (`app.permissions`)
- Permissions are auto-granted to owner and admin roles
- Step 5 shows whether each key is new or existing
- Warning: other roles need manual setup

### 4. Sidebar Refresh & Navigation

- `useWorkspaceNavigation` now exposes a `refresh()` function
- Success screen has "Refresh Sidebar" and "Open Created DocType" buttons
- "Open Created DocType" navigates directly to the new list page

### 5. Success Checklist

The final success state shows a completion checklist:
- DocType created
- Fields created
- List View created
- Form Layout created
- Actions created
- Permissions created/granted
- Workspace Item created
- Ready to create records

## Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/0027_custom_doctype_wizard_hardening.sql` | Bundle RPC with permission provisioning |
| `tests/simulations/custom_doctype_wizard_hardening_flow.sql` | Simulation testing bundle, duplicates, permissions |
| `docs/PHASE_2_10_CUSTOM_DOCTYPE_WIZARD_HARDENING.md` | This architecture document |

## Files Modified

| File | Change |
|------|--------|
| `src/lib/metadata/metadata-studio-api.ts` | RPC-based `createCustomDocTypeBundle`, duplicate check functions, permission key lookup |
| `src/components/metadata-studio/CustomDocTypeWizard.tsx` | Duplicate checks, permission info in Step 5, success checklist, sidebar refresh + open button |
| `src/hooks/useWorkspaceNavigation.ts` | Added `refresh()` callback |
| `src/App.tsx` | Wire refresh + `handleNavigateToDocType` through to renderer |
| `src/components/metadata/DynamicRouteRenderer.tsx` | Pass refresh + navigate props to wizard |
| `scripts/run-simulation.cjs` | Added Phase 2.10 simulation file |
| `docs/METADATA_ENGINE.md` | Added Phase 2.10 hardening section |
| `progress.md` | Added Phase 2.10 status |

## Verification Checklist

- [x] Bundle RPC creates all 6 metadata sets atomically
- [x] Duplicate doctype_key rejected gracefully
- [x] Duplicate workspace item_key rejected gracefully
- [x] New permission keys created in catalog
- [x] Owner/admin roles receive grants
- [x] Step 5 shows permission status (new vs existing)
- [x] Non-owner/admin roles NOT auto-granted
- [x] Uppercase keys rejected in wizard
- [x] Sidebar refresh updates navigation
- [x] Success checklist shows completion status
- [x] TypeScript typecheck: 0 errors
- [x] Build: success
- [ ] Supabase Cloud simulation: all steps PASS
- [ ] Real UI verification: create → open → CRUD

## Out of Scope

- Warehouse CRUD
- GRN, Stock Ledger
- Physical table creation from UI
- Workflow transition engine
- Naming series generation engine
- Generic storage for stock-changing transactional DocTypes
