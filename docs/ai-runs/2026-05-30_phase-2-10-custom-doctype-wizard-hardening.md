# AI Run Report: Phase 2.10 — Custom DocType Wizard Hardening

## Goal
Harden the Phase 2.9 Custom DocType Wizard so a real authenticated user can create a custom DocType, see it in the sidebar, open it, create a record, edit it, and deactivate it.

## Branch
`phase-2.5-metadata-engine`

## Commits
*(set after commit)*

## Files Created (3)
| File | Purpose |
|------|---------|
| `supabase/migrations/0027_custom_doctype_wizard_hardening.sql` | `erp_create_custom_doctype_bundle` RPC — transaction-safe bundle insert with permission auto-provisioning |
| `tests/simulations/custom_doctype_wizard_hardening_flow.sql` | Simulation testing bundle RPC, duplicates, permission keys, grants |
| `docs/PHASE_2_10_CUSTOM_DOCTYPE_WIZARD_HARDENING.md` | Architecture document for Phase 2.10 |

## Files Modified (7)
| File | Change |
|------|--------|
| `src/lib/metadata/metadata-studio-api.ts` | RPC-based `createCustomDocTypeBundle`, duplicate check functions, permission key lookup |
| `src/components/metadata-studio/CustomDocTypeWizard.tsx` | Duplicate checks, permission info in Step 5, success checklist, sidebar refresh + open button |
| `src/hooks/useWorkspaceNavigation.ts` | Added `refresh()` callback to `useWorkspaceNavigation` |
| `src/App.tsx` | Wire `refreshSidebar` + `handleNavigateToDocType` through to renderer |
| `src/components/metadata/DynamicRouteRenderer.tsx` | Pass refresh + navigate props to wizard via `MetadataStudioRouter` |
| `scripts/run-simulation.cjs` | Added Phase 2.10 simulation file reference |
| `docs/METADATA_ENGINE.md` | Added Phase 2.10: wizard hardening section with architecture diagram |
| `progress.md` | Added Phase 2.10 status |

## Database Changes
- Migration `0027_custom_doctype_wizard_hardening.sql` applied to Supabase Cloud

### Bundle RPC: `public.erp_create_custom_doctype_bundle`
- SECURITY DEFINER — bypasses RLS for metadata table writes
- Parameters: doctype_key, module_key, label, description, route, is_company_scoped, fields (jsonb), actions (jsonb), workspace_key, workspace_item_label, company_id
- Single PostgreSQL transaction with exception handling
- Returns jsonb with `ok`, `doctype_key`, `label`, `permissions_created`, `grants_added`

### What the RPC Does (in order)
1. Validates input (at least one field)
2. Checks for duplicate doctype_key → returns error if exists
3. Checks for duplicate workspace item key → returns error if exists
4. Inserts DocType (`app.erp_doctypes`)
5. Inserts DocFields (`app.erp_docfields`)
6. Inserts List View (`app.erp_list_views`) — auto-generated columns/search/sort
7. Inserts Form Layout (`app.erp_form_layouts`) — Basic Info section
8. Inserts DocType Actions (`app.erp_doctype_actions`) — 4 actions
9. Provisions permission keys in `app.permissions` catalog (if new)
10. Inserts Workspace Item (`app.erp_workspace_items`)
11. Grants permissions to owner and admin roles via `app.company_role_permissions`

## Permission Auto-Provisioning
- New permission keys are created in `app.permissions` with module_key = the DocType's module
- Permissions are granted to owner and admin roles only
- Other roles (warehouse_manager, stock_operator, viewer, auditor) are NOT auto-granted
- Step 5 in the wizard shows whether each permission key is new or existing

## Sidebar Refresh & Navigation
- `useWorkspaceNavigation()` exposes `refresh()` function
- Wizard success screen has "Refresh Sidebar" button
- "Open Created DocType" button navigates directly to the new DocType's list view
- Success screen shows full checklist: DocType, Fields, List View, Form Layout, Actions, Permissions, Workspace Item, Ready

## UI Changes
- **Step 0**: Duplicate doctype_key detection with async check, uppercase key rejection
- **Step 5**: Permission status shown per action (new vs. existing in catalog)
- **Success**: Full completion checklist, "Open Created DocType" button, "Refresh Sidebar" button
- **Errors**: Clear error messages for duplicates, permission grants

## Simulation Results
Simulation verified against Supabase Cloud via Management API:

| # | Check | Result |
|---|-------|--------|
| 1 | Bundle RPC exists | ✅ PASS |
| 2 | Bundle context loaded (module, workspace, company) | ✅ PASS |
| 3 | Bundle created via RPC | ✅ PASS |
| 4 | DocType exists | ✅ PASS |
| 5 | 5 DocFields exist | ✅ PASS |
| 6 | Default List View exists | ✅ PASS |
| 7 | Default Form Layout exists | ✅ PASS |
| 8 | 4 DocType Actions exist | ✅ PASS |
| 9 | Workspace Item exists | ✅ PASS |
| 10 | Permission keys created in catalog | ✅ PASS |
| 11 | Permissions granted to owner/admin roles | ✅ PASS |
| 12 | Duplicate doctype_key rejected | ✅ PASS |
| 13 | Unknown field rejected | ✅ PASS |
| 14 | Rollback confirmed — 0 test rows remain | ✅ PASS |

## Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 32 warnings (all pre-existing) |
| `npm run test` | 31 pass, 6 fail (all pre-existing) |
| `npm run build` | Success |
| `npm run test:simulation` | All 9 simulation files found |
| Supabase Cloud migration 0027 | ✅ Applied without errors |
| Supabase Cloud simulation | ✅ All 14 steps PASS — no errors, rollback confirmed |

## Known Gaps
1. **Naming series not auto-created**: Documents have no auto-generated document_number until naming series engine is built
2. **Workflow not configured**: New DocTypes have no workflow/state machine — intentional
3. **Non-admin role permissions**: Only owner/admin roles get auto-granted. Other roles must be updated manually via Roles & Permissions
4. **No workspace creation**: The wizard only adds items to existing workspaces
5. **Full document CRUD requires real auth context**: RPC calls in SQL Editor cannot simulate real user permissions (missing `auth.uid()`)
6. **Real UI verification not yet performed**: The app must be tested with an authenticated user session to verify the full flow end-to-end

## Next Recommended Task
Real UI verification of the custom DocType flow (create → sidebar → open → CRUD), then begin Phase 3: Warehouse hierarchy.
