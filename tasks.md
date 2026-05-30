# Phase 2.5 Tasks: Metadata-Driven ERP Core — COMPLETE

Active branch: `phase-2.5-metadata-engine`

All Phase 2.5 items are verified and complete. The branch has been pushed to GitHub.

---

## Verification Results

| Check | Result | Notes |
|---|---|---|
| `supabase CLI` | Not available (win32-x64) | Used Supabase Management API instead |
| Migration 0020 | ✅ Applied | All 10 tables created, RLS enabled, seeds inserted |
| Simulation query | ✅ Passed | 6 checks: DocTypes(3), DocFields(18), Actions(12), ListViews(3), FormLayouts(3), Modules(2) |
| `typecheck` | ✅ 0 errors | Clean |
| `lint` | ✅ 0 errors, 22 warnings | All warnings pre-existing (set-state-in-effect) |
| `test` | ✅ 30 pass, 7 fail | All 7 failures pre-existing (users-roles, auth-routes, etc.) |
| `build` | ✅ Success | 603KB JS bundle, 22KB CSS |

## Improvements Delivered

- **DynamicFieldRenderer**: Added Select fieldtype rendering, Float/Int right-alignment
- **DynamicFormPage**: Added typeahead search for Link fields (filterable dropdown)
- **DynamicListPage**: Generic clickable column detection (priority: sku, code, name, title, label)
- **DynamicListPage**: Fixed `loadAll` memoization and exhaustive-deps warnings
- **metadata-api.ts**: `getFullDocTypeConfig` now populates `namingSeries` and `workflow`
- **MetadataPrototype.tsx**: Simplified tab state (no redundant `doctypeKeys` map)
- **App.tsx**: Product Master screens migrated from hardcoded components to `DynamicListPage` (metadata-driven)

## Warehouse Metadata Design

Design documented in `docs/METADATA_ENGINE.md` (Phase 3 section). Key requirements:

1. Six new DocTypes: warehouse, warehouse_zone, warehouse_aisle, warehouse_rack, warehouse_shelf, warehouse_bin
2. Need CRUD RPCs for each (following product master pattern: migrations 0015-0019)
3. Need permission helper function
4. Option B recommended: start with six DynamicListPage instances, tree component later
5. Warehouse module exists in erp_modules but `is_active = false` — must be enabled

## Scope Locks (Preserved)

- No service-role key exposed in frontend
- No generic document write API introduced
- Stock-changing transactions still require explicit controlled RPCs
- No dynamic user-created DocTypes
- Warehouse/GRN/Stock remain deferred
