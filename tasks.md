# Phase 6.8.5 Tasks: Metadata Studio Module Manager Repair

Status: COMPLETE

## Summary

Builder Home no longer showed a clear Module Builder/Module Manager, but DocType Builder required `module_key` and loaded options from `app.erp_modules`. This blocked or confused DocType creation because users could not easily add, edit, deactivate, or delete modules used by DocTypes.

**Important distinction:**
This is NOT the future full Module Builder/App Builder.
This is a focused `app.erp_modules` manager required by DocType creation.
Phase 6.9 was NOT started.

## Tasks

### 1. Add Builder Home card and sidebar item
- [x] Add Module Manager card to `builderSections` in `MetadataStudioHome.tsx`
- [x] Add `metadata_studio_module_manager` to `METADATA_STUDIO_SHORTCUTS` sidebar
- [x] Update recommended builder flow to include Module Manager first

### 2. Add Module Manager screen
- [x] Create `src/components/metadata-studio/ModuleManager.tsx`
- [x] List modules with key, label, description, icon, route, sort, is_active, doctype_count
- [x] Create module form (label, key auto-snaked, description, icon, route, sort_order)
- [x] Edit module form
- [x] Deactivate/reactivate toggle
- [x] Safe delete with reference checking

### 3. Safe delete/deactivate rules
- [x] Block delete if DocTypes reference module (show count)
- [x] Show "Deactivate Instead" suggestion
- [x] Prefer soft deactivate (set `is_active = false`)

### 4. DocType Builder improvement
- [x] Warning if no active modules exist
- [x] "Manage Modules" button beside Module select
- [x] Active modules shown first, inactive dimmed
- [x] `loadModuleKeys()` returns `is_active` field

### 5. Backend RPCs
- [x] Migration `0055_metadata_module_manager.sql`
- [x] `erp_list_modules` — list with doctype_count
- [x] `erp_create_module` — create with permission check
- [x] `erp_update_module` — update with permission check
- [x] `erp_deactivate_module` — soft-deactivate
- [x] `erp_reactivate_module` — reactivate
- [x] `erp_delete_module_if_unused` — delete only if no references
- [x] `erp_module_has_doctypes` — check helper

### 6. Permissions
- [x] `view_metadata_modules`, `create_metadata_module`, `update_metadata_module`, `delete_metadata_module`
- [x] Granted to owner/admin via `role_permission_grants`
- [x] Auto-included in `create_company_role` owner/admin grants
- [x] All RPCs use `app.current_user_has_manage_metadata()` as master gate
- [x] Granular permissions seeded for future Access Control Manager visibility

### 7. Verification
- [x] TypeScript: 0 errors
- [x] ESLint: 0 errors
- [x] Vitest: 77/77 PASS
- [x] Build: SUCCESS
- [x] Simulation: scripts ready
- [x] Browser verifier: 15/15 PASS (UI-only — admin flow + restricted user UI checks)
- [x] Cloud verifier: 25/25 PASS (real authenticated Supabase auth + RPC calls)
- [x] Restricted user verifier: strict (required env vars, exit non-zero)

### 8. Documentation
- [x] Created `docs/ai-runs/2026-06-06_phase-6-8-5-metadata-module-manager-repair.md`
- [x] Updated `tasks.md`
- [x] Updated `progress.md`
- [x] Docs state: Not the future full Module Builder. Phase 6.9 not started.

### 9. Push
- [x] Phase 6.8.5.1 commit `99f0896` pushed to `phase-2.5-metadata-engine`
- [x] Phase 6.8.5.2 final commit `556820e` pushed to `phase-2.5-metadata-engine`
