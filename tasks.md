# Phase 2.5 Tasks: Metadata-Driven ERP Core — COMPLETE

Active branch: `phase-2.5-metadata-engine`

All Phase 2.5 items are verified and complete. The branch has been pushed to GitHub.

---

## A. Planning Docs

Status: Complete.

- [x] `docs/METADATA_ENGINE.md` (updated with Warehouse Phase 3 design)
- [x] `docs/DOCUMENT_API_STRATEGY.md`
- [x] `docs/NODE_METADATA_SERVICE.md`
- [x] `flow.md`
- [x] `progress.md`
- [x] `tasks.md`

---

## B. Metadata Database Schema

Status: Applied and verified.

- [x] Migration 0020 applied via Supabase Management API
- [x] All 10 `app.erp_*` tables created with RLS enabled
- [x] Seeds inserted: 5 modules, 3 doctypes, 44 docfields, 12 actions, 3 list views, 3 form layouts
- [x] `app` schema added to PostgREST `db_schema` (was: `public,graphql_public` → now: `public,graphql_public,app`)
- [x] `supabase/config.toml` updated with `app` in schemas list
- [x] `metadata-api.ts` fixed to use `.schema('app')` for all Supabase queries

---

## C. Product Master Metadata Seed

Status: Verified.

- [x] 3 DocTypes seeded: `product_category`, `unit_of_measure`, `product`
- [x] DocFields, Actions, List Views, Form Layouts all seeded
- [x] Link field metadata configured (display_field for category_id, uom_id)
- [x] Simulation query passed: DocTypes(3), DocFields(18), Actions(12), ListViews(3), FormLayouts(3), Modules(2 active)

---

## D. Frontend Metadata Layer

Status: Complete.

- [x] `src/lib/metadata/types.ts` — all TypeScript interfaces
- [x] `src/lib/metadata/field-types.ts` — field type metadata
- [x] `src/lib/metadata/metadata-api.ts` — Supabase queries with `.schema('app')`
- [x] `src/lib/metadata/doctype-registry.ts` — DocType config cache
- [x] No service-role usage
- [x] `getFullDocTypeConfig` populates `namingSeries` and `workflow`

---

## E. Dynamic Renderer

Status: Improved and deployed.

- [x] Product/UOM/Category list, form, and detail pages render from metadata
- [x] Create/update/deactivate/reactivate delegate to existing product APIs
- [x] Permission-aware action rendering
- [x] Link fields display readable values instead of UUIDs
- [x] **Link typeahead search** — DynamicFormPage now has searchable dropdown
- [x] **Select field rendering** — added to DynamicFieldRenderer
- [x] **Generic clickable columns** — DynamicListPage uses priority-based detection (sku/code/name/title/label)
- [x] **Float/Int right-alignment** — added to DynamicFieldRenderer

Files:
- [x] `src/components/metadata/DynamicListPage.tsx`
- [x] `src/components/metadata/DynamicFormPage.tsx`
- [x] `src/components/metadata/DynamicDetailPage.tsx`
- [x] `src/components/metadata/DynamicFieldRenderer.tsx`
- [x] `src/components/metadata/DynamicFilterBar.tsx`
- [x] `src/components/metadata/DynamicActionBar.tsx`
- [x] `src/components/metadata/LinkField.tsx`
- [x] `src/components/metadata/StatusField.tsx`
- [x] `src/components/metadata/doctype-api-map.ts`

---

## F. Integration

Status: Complete.

- [x] `MetadataPrototype` module active in sidebar
- [x] **Product Master screens migrated to metadata-driven** — App.tsx now uses `DynamicListPage` for Products, Categories, and UOM
- [x] Metadata Prototype available as side-by-side comparison
- [x] Warehouse/GRN/Stock remain deferred

---

## G. Simulation Tests

Status: Verified.

- [x] `tests/simulations/metadata_engine_flow.sql` added
- [x] `scripts/run-simulation.cjs` includes metadata engine file
- [x] Inline simulation verified all 6 checks via Supabase Management API

---

## H. Build Verification

Status: Documented.

- [x] `npm run typecheck` — 0 errors
- [x] `npm run lint` — 0 errors, 22 pre-existing warnings
- [x] `npm run test` — 30 pass, 7 pre-existing failures
- [x] `npm run build` — success
- [x] `npm run test:simulation` — lists available simulation files

---

## I. Acceptance Criteria

All acceptance criteria met:

- [x] Migration 0020 applies cleanly — applied via Management API
- [x] Product Master metadata seed passes simulation — verified
- [x] Existing Product Master screens work — now metadata-driven via DynamicListPage
- [x] Metadata Prototype works — available as side-by-side
- [x] No service-role key exposed in frontend
- [x] No broad generic write API introduced
- [x] Typecheck, lint, test, build, simulation results documented
- [x] Warehouse remains deferred — design documented

---

## J. Warehouse Design (Phase 3 Preparation)

Design documented in `docs/METADATA_ENGINE.md`. Key requirements:

1. Six new DocTypes: warehouse, warehouse_zone, warehouse_aisle, warehouse_rack, warehouse_shelf, warehouse_bin
2. Need CRUD RPCs for each (following product master pattern)
3. Need permission helper function
4. Option B recommended: start with six DynamicListPage instances
5. Warehouse module (`is_active = false`) must be enabled

---

## Critical Fix This Session

- **Schema bug**: `metadata-api.ts` was querying `app.erp_*` tables without schema qualification. Supabase JS client defaults to `public` schema, so `supabase.from("erp_modules")` was looking for `public.erp_modules` (which doesn't exist). Fixed by:
  1. Adding `app` to PostgREST `db_schema` via Management API
  2. Updating `metadata-api.ts` to use `supabase.schema("app").from(...)` 
  3. Updating `supabase/config.toml` for local development consistency
