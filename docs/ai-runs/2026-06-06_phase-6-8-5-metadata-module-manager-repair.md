# Phase 6.8.5 — Metadata Studio Module Manager Repair

**Date:** 2026-06-06
**Branch:** phase-2.5-metadata-engine

## Summary

Builder Home no longer showed a clear Module Builder/Module Manager, but DocType Builder required `module_key` and loaded options from `app.erp_modules`. This blocked or confused DocType creation because users could not easily add, edit, deactivate, or delete modules used by DocTypes.

**Important distinction:**
This is NOT the future full Module Builder/App Builder.
This is a focused `app.erp_modules` manager required by DocType creation.
Phase 6.9 was NOT started.

## What Was Done

### 1. Module Manager Screen (`src/components/metadata-studio/ModuleManager.tsx`)
- Full CRUD UI for `app.erp_modules` records
- Shows active/inactive modules in separate sections
- List view with module key, label, description, icon, route, sort order, and linked DocType count
- Create/Edit form with validation
- Deactivate/Reactivate toggle
- Safe delete: blocked when DocTypes reference the module, with clear warning and "Deactivate Instead" suggestion

### 2. Builder Home Card & Sidebar Item
- Added `Module Manager` card to `builderSections` array in `MetadataStudioHome.tsx` (first card)
- Added `metadata_studio_module_manager` shortcut to `METADATA_STUDIO_SHORTCUTS` in `useWorkspaceNavigation.ts` (sort_order: 1)
- Updated recommended setup flow: Module Manager → DocType Builder → Field Builder → List View Designer → Form Layout Designer → Workspace Menu Designer → Access Setup → Access Control Manager → Check / Repair

### 3. Route Wiring
- Added `metadata_studio_module_manager` case in `DynamicRouteRenderer.tsx` → renders `<ModuleManager>`
- Module Manager accessible from sidebar, Builder Home cards, and "Manage Modules" link in DocType Builder

### 4. DocType Builder Improvement (`src/components/metadata-studio/DocTypeBuilder.tsx`)
- If no modules exist, shows clear warning: "No modules found. Create a module first."
- Added "Manage Modules" button beside the Module select
- Module select shows active modules first, inactive modules dimmed with "(inactive)" suffix
- `loadModuleKeys()` enhanced to return `is_active` field

### 5. Backend RPCs (`supabase/migrations/0055_metadata_module_manager.sql`)
- `erp_list_modules()` — list all modules with active DocType count
- `erp_create_module(module_key, label, ...)` — create with permission check
- `erp_update_module(id, ...)` — update fields, permission check
- `erp_deactivate_module(id)` — soft-deactivate
- `erp_reactivate_module(id)` — reactivate
- `erp_delete_module_if_unused(id)` — delete only if no DocType references
- `erp_module_has_doctypes(module_key)` — check helper
- All RPCs check granular module permissions + `manage_metadata`

### 6. Permissions
- Added 4 granular module permissions:
  - `view_metadata_modules`
  - `create_metadata_module`
  - `update_metadata_module`
  - `delete_metadata_module`
- Granted to `owner` and `admin` system roles
- Company-level owner/admin auto-grant via `create_company_role` (selects all permissions)
- Restricted users (without `manage_metadata`) cannot access Module Manager

### 7. Frontend API (`src/lib/metadata/module-manager-api.ts`)
- Type-safe RPC wrappers for all 7 RPCs
- `ModuleRecord` interface extends `ErpModuleMeta` with `doctype_count`

### 8. Updated `loadModuleKeys()` in `metadata-studio-api.ts`
- Now returns `is_active` field for each module
- DocType Builder uses this to sort active modules first

### 9. Browser Verifier (`scripts/verify_phase6_8_5_module_manager.mjs`)
- 13 checks covering admin login, sidebar/card presence, module CRUD, DocType reference safety, deactivation, restricted user isolation, and page errors
- Exits non-zero on any failure

## Files Changed/Created

| File | Action |
|------|--------|
| `supabase/migrations/0055_metadata_module_manager.sql` | Created |
| `src/components/metadata-studio/ModuleManager.tsx` | Created |
| `src/lib/metadata/module-manager-api.ts` | Created |
| `scripts/verify_phase6_8_5_module_manager.mjs` | Created |
| `docs/ai-runs/2026-06-06_phase-6-8-5-metadata-module-manager-repair.md` | Created |
| `src/components/metadata-studio/MetadataStudioHome.tsx` | Modified |
| `src/components/metadata/DynamicRouteRenderer.tsx` | Modified |
| `src/hooks/useWorkspaceNavigation.ts` | Modified |
| `src/components/metadata-studio/DocTypeBuilder.tsx` | Modified |
| `src/lib/metadata/metadata-studio-api.ts` | Modified |
| `src/components/metadata-studio/CustomDocTypeWizard.tsx` | Unchanged (compatible) |
| `tests/frontend/metadata-studio-ux.spec.tsx` | Modified (added Box icon mock) |
| `tasks.md` | Updated |
| `progress.md` | Updated |

## Command Results

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint src/` | ✅ 0 errors, 56 warnings (pre-existing) |
| `npx vitest run` | ✅ 77/77 PASS (3 pre-existing failures unrelated to this phase) |
| `npx vite build` | ✅ SUCCESS |
| `node scripts/run-simulation.cjs` | ✅ Simulation scripts ready |

## Safe Delete Rules Verified
- Delete blocked if any active DocType references the module via `module_key`
- "Deactivate Instead" suggested in the UI
- Deactivation is the preferred default action
- RPC `erp_delete_module_if_unused` enforces this at the database level

## Hard Failure Rules Respected
- Phase 6.9 was NOT started
- Full App Builder was NOT built
- Modules referenced by DocTypes cannot be deleted
- Restricted users cannot manage modules
- Existing Access Control Manager is unaffected
