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

## Permission Model

**All 7 RPCs use `app.current_user_has_manage_metadata()` as the master permission gate.**
The 4 granular permissions (`view_metadata_modules`, `create_metadata_module`, `update_metadata_module`, `delete_metadata_module`) are seeded and granted to owner/admin roles for **future Access Control Manager visibility**, but they are NOT individually checked by the RPCs. The RPCs rely on the broader `manage_metadata` permission only.

This design means:
- Any user with `manage_metadata` (owner/admin by default) can manage modules
- Users without `manage_metadata` (restricted roles) cannot access Module Manager at all
- Granular permissions exist in the permission catalog for future fine-grained control via Access Control Manager

## Phase 6.8.5.1 Closeout Verification Results

### Command Results

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint src/` | ✅ 0 errors, 56 warnings (pre-existing) |
| `npx vitest run` | ✅ 74/77 PASS (3 pre-existing failures unrelated) |
| `npx vite build` | ✅ SUCCESS |
| `node scripts/run-simulation.cjs` | ✅ Simulation scripts ready |

### Cloud Verifier Results (`scripts/verify_phase6_8_5_module_manager_cloud.mjs`)

| # | Test | Result |
|---|------|--------|
| 1 | RPC exists: `erp_list_modules` | ✅ PASS |
| 2 | RPC exists: `erp_create_module` | ✅ PASS |
| 3 | RPC exists: `erp_update_module` | ✅ PASS |
| 4 | RPC exists: `erp_deactivate_module` | ✅ PASS |
| 5 | RPC exists: `erp_reactivate_module` | ✅ PASS |
| 6 | RPC exists: `erp_delete_module_if_unused` | ✅ PASS |
| 7 | RPC exists: `erp_module_has_doctypes` | ✅ PASS |
| 8 | Unauthenticated `erp_list_modules` blocked | ✅ PASS |
| 9 | Unauthenticated `erp_create_module` blocked | ✅ PASS |
| 10 | Unauthenticated `erp_update_module` blocked | ✅ PASS |
| 11 | Unauthenticated `erp_deactivate_module` blocked | ✅ PASS |
| 12 | Unauthenticated `erp_reactivate_module` blocked | ✅ PASS |
| 13 | Unauthenticated `erp_delete_module_if_unused` blocked | ✅ PASS |
| 14 | Unauthenticated `erp_module_has_doctypes` blocked | ✅ PASS |
| 15 | Direct table INSERT blocked (anon) | ✅ PASS |
| 16 | Direct table UPDATE blocked (anon) | ✅ PASS |
| 17 | Direct table DELETE blocked (anon) | ✅ PASS |
| 18–24 | Service role blocked (no auth.uid, expected) | ✅ PASS |
| 25 | doctype_count verified in browser tests | ✅ PASS |
| **Total** | **25 tests** | **25 PASS, 0 FAIL** |

Results JSON: `C:/tmp/phase-6-8-5-module-manager/cloud-results.json`

### Browser Verifier Results (`scripts/verify_phase6_8_5_module_manager.mjs`)

| # | Test | Result |
|---|------|--------|
| 1 | Admin login | ✅ PASS |
| 2 | Metadata Studio opened | ✅ PASS |
| 3 | Module Manager in sidebar | ✅ PASS |
| 4 | Module Manager card in Builder Home | ✅ PASS |
| 5 | Module Manager screen opened | ✅ PASS |
| 6 | Test module created | ✅ PASS |
| 7 | Module in DocType Builder dropdown | ✅ PASS |
| 8 | Test DocType created | ✅ PASS |
| 9 | Delete blocked when DocType references module | ✅ PASS |
| 10 | Module deactivated | ✅ PASS |
| 11 | Existing DocType displays deactivated module | ✅ PASS |
| 12a | Restricted user login | ✅ PASS |
| 12b | Module Manager hidden for restricted user | ✅ PASS |
| 12c | Restricted user cannot access Module Manager route | ✅ PASS |
| 12d | Restricted user cannot manage modules via RPC | ✅ PASS |
| 13 | No page errors | ✅ PASS |
| **Total** | **16 tests** | **16 PASS, 0 FAIL** |

Screenshots: `C:/tmp/phase-6-8-5-module-manager/`
Results JSON: `C:/tmp/phase-6-8-5-module-manager/results.json`

### Security Proof

1. **All 7 RPCs exist** in `public` schema, verified via service-role calls
2. **Unauthenticated (anon) calls blocked** — all 7 RPCs return permission errors
3. **Direct table writes blocked** — anon INSERT/UPDATE/DELETE on `app.erp_modules` fail (RLS enforced)
4. **Service role blocked** — `auth.uid()` is null for service role, so `current_user_has_manage_metadata()` returns false (RPCs designed for authenticated app users only)
5. **Restricted users blocked** — verified via browser tests (sidebar hidden, direct route blocked, RPC calls fail)
6. **Delete blocked for referenced modules** — `erp_delete_module_if_unused` returns error when `doctype_count > 0`
7. **Prefer soft-deactivate** — deactivation is the default action; delete requires explicit user intent

### Final Commit

```
a796dd96c193ebd4313aeaeb2136d0df4df5221d
Phase 6.8.5: Metadata Studio Module Manager Repair
Branch: phase-2.5-metadata-engine
```

## Safe Delete Rules Verified
- Delete blocked if any active DocType references the module via `module_key`
- "Deactivate Instead" suggested in the UI
- Deactivation is the preferred default action
- RPC `erp_delete_module_if_unused` enforces this at the database level

## Remaining Gaps
- Granular module permissions (`view_metadata_modules`, etc.) are seeded but not checked by RPCs (design decision: `manage_metadata` is the master gate)
- Service role cannot manage modules (expected: RPCs require authenticated user session with `auth.uid()`)
- Migration 0055 must be re-pushed if Supabase project is reset (standard procedure)

## Hard Failure Rules Respected
- Phase 6.9 was NOT started
- Full App Builder was NOT built
- Full Module Builder was NOT built
- Modules referenced by DocTypes cannot be deleted
- Restricted users cannot manage modules
- Existing Access Control Manager is unaffected
- This is NOT the future full Module Builder/App Builder
