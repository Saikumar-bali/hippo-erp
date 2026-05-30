# Phase 2.5 Tasks: Metadata-Driven ERP Core

Active branch: `phase-2.5-metadata-engine`

Goal: make Hippo ERP move from code-first Product Master screens toward a Frappe-inspired metadata-driven ERP engine while keeping the existing Product Master safe and working.

## Scope Locks

- Do not implement Warehouse, GRN, Stock Ledger, Transfers, Adjustments, Cycle Counts, Reservations, Reorder Alerts, Valuation, Dashboard, or Reports in this phase.
- Do not replace the existing Product Master screens until the metadata prototype is verified.
- Do not expose any service-role key in frontend code.
- Do not add dynamic user-created DocTypes yet.
- Do not create database tables from UI.
- Do not use generic CRUD for stock-changing transactions.
- User-facing text should say **Company**. Existing `tenant_id` remains internal company context until a planned schema rename.

---

## Repository Baseline

Current inspected files:

- `package.json`
- `src/App.tsx`
- `src/lib/erp-modules.ts`
- `src/lib/permission-access.ts`
- `src/hooks/usePermissions.ts`
- `src/components/PermissionGate.tsx`
- `src/components/MetadataPrototype.tsx`
- `src/components/metadata/*`
- `src/components/products/*`
- `src/lib/product-api.ts`
- `src/lib/product-validation.ts`
- `src/lib/types.ts`
- `supabase/migrations/0020_metadata_engine_core.sql`
- `docs/*`
- `flow.md`
- `progress.md`
- `tasks.md`

Current design decision:

- Existing Product Master stays code-first for now.
- Metadata Prototype runs side-by-side.
- Product/category/UOM writes go through existing product RPC APIs.
- Generic document writes are future work only after permissions, field whitelist, validation, company context, and audit are implemented.

---

# A. Planning Docs

Status: Complete.

Files:

- [x] `docs/METADATA_ENGINE.md`
- [x] `docs/DOCUMENT_API_STRATEGY.md`
- [x] `docs/NODE_METADATA_SERVICE.md`
- [x] `flow.md`
- [x] `progress.md`
- [x] `tasks.md`

Checks:

- [x] Frappe is documented as inspiration only.
- [x] Supabase remains primary auth/database layer.
- [x] Metadata-driven does not mean arbitrary writes.
- [x] Stock-changing actions remain explicit services/RPC.
- [x] Node.js backend is documented as optional future service.

---

# B. Metadata Database Schema

Status: Implemented and corrected.

File:

- [x] `supabase/migrations/0020_metadata_engine_core.sql`

Tables:

- [x] `app.erp_modules`
- [x] `app.erp_doctypes`
- [x] `app.erp_docfields`
- [x] `app.erp_doctype_actions`
- [x] `app.erp_list_views`
- [x] `app.erp_form_layouts`
- [x] `app.erp_naming_series`
- [x] `app.erp_workflows`
- [x] `app.erp_workflow_states`
- [x] `app.erp_workflow_transitions`

Corrections made:

- [x] Added unique constraint for `app.erp_list_views(doctype_key, view_key)`.
- [x] Added unique constraint for `app.erp_form_layouts(doctype_key, layout_key)`.
- [x] Fixed RLS write-block policy syntax.
- [x] Made metadata policies idempotent with `drop policy if exists`.
- [x] Kept metadata writes migration/server-managed in this phase.

Required verification:

- [ ] Apply migration in a safe Supabase branch/database.
- [ ] Confirm migration applies from a clean database.
- [ ] Confirm migration applies after previous local attempts, if any.

---

# C. Product Master Metadata Seed

Status: Implemented.

Seeded modules:

- [x] `product_master`
- [x] `inventory`
- [x] `warehouse`
- [x] `purchasing`
- [x] `reporting`

Seeded DocTypes:

- [x] `product_category`
- [x] `unit_of_measure`
- [x] `product`

Seeded config:

- [x] DocFields for all three DocTypes.
- [x] Action permissions mapped to existing `view_products`, `create_product`, `update_product`, `delete_product`.
- [x] Default list views.
- [x] Default form layouts.
- [x] Link metadata for `category_id` and `uom_id` so UI can show readable values instead of raw UUIDs.

Required verification:

- [ ] Run `tests/simulations/metadata_engine_flow.sql` in Supabase SQL Editor.
- [ ] Confirm all metadata simulation checks show `PASS`.

---

# D. Frontend Metadata Layer

Status: Implemented prototype.

Files:

- [x] `src/lib/metadata/types.ts`
- [x] `src/lib/metadata/field-types.ts`
- [x] `src/lib/metadata/metadata-api.ts`
- [x] `src/lib/metadata/doctype-registry.ts`

Done:

- [x] Metadata TypeScript types added.
- [x] Metadata reads go through Supabase client.
- [x] DocType config cache added.
- [x] No service-role usage.
- [x] Error states surfaced.

Next improvements:

- [ ] Add runtime validation for metadata JSON shape.
- [ ] Add graceful fallback when metadata migration is missing.
- [ ] Add more field types: `Currency`, `Barcode`, `JSON`, `Table`, `User`, `ReadOnly`.

---

# E. Dynamic Renderer Prototype

Status: Implemented prototype.

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

Done:

- [x] Product/category/UOM list views render from metadata.
- [x] Forms render from metadata layout sections.
- [x] Detail pages render from metadata layout sections.
- [x] Create/update/deactivate/reactivate delegate to existing product APIs.
- [x] Permission-aware action rendering exists.
- [x] Link fields can render display values instead of UUIDs.

Next improvements:

- [ ] Replace separate `canUpdate`/`canDelete` props with action metadata checks.
- [ ] Make create/edit/deactivate visibility fully driven by `erp_doctype_actions`.
- [ ] Improve Link labels to support `code + name`, not only one display field.
- [ ] Add sorting from `sort_json`.
- [ ] Add validation from `validation_rules`.
- [ ] Add dependency behavior from `depends_on`.
- [ ] Add read-only form mode for users with read-only permission.

---

# F. Integration

Status: Implemented side-by-side.

Files:

- [x] `src/components/MetadataPrototype.tsx`
- [x] `src/lib/erp-modules.ts`
- [x] `src/App.tsx`

Done:

- [x] `Metadata Prototype` module is active.
- [x] Metadata tabs exist for Product, Product Category, and UOM.
- [x] Existing Product Master screens are still wired separately.
- [x] Warehouse/GRN/Stock remain deferred.

Manual UI checks:

- [ ] Existing `Products` screen still loads.
- [ ] Existing `Product categories` screen still loads.
- [ ] Existing `Units of measure` screen still loads.
- [ ] `Metadata Prototype` loads after migration.
- [ ] Metadata Product list does not show raw UUIDs for Category/UOM.
- [ ] Metadata create/edit form works for category.
- [ ] Metadata create/edit form works for UOM.
- [ ] Metadata create/edit form works for product.

---

# G. Simulation Tests

Status: Added.

Files:

- [x] `tests/simulations/metadata_engine_flow.sql`
- [x] `scripts/run-simulation.cjs`

Command:

```bash
npm run test:simulation
```

Important: this command checks that simulation files exist and prints execution instructions. It does not automatically execute SQL.

Manual Supabase SQL simulation order:

1. `tests/simulations/company_profile_flow.sql`
2. `tests/simulations/product_master_flow.sql`
3. `tests/simulations/metadata_engine_flow.sql`

Metadata simulation must confirm:

- [ ] Metadata tables exist.
- [ ] Product Master DocTypes exist.
- [ ] Product fields exist.
- [ ] Link display metadata exists.
- [ ] Action-to-permission metadata exists.
- [ ] Default list/form layouts exist.
- [ ] RLS is enabled on metadata tables.
- [ ] Generic document write functions are not present yet.

---

# H. Build Verification

Status: Pending.

Run locally or in CI:

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Record results:

- [ ] `npm run typecheck` result documented.
- [ ] `npm run lint` result documented.
- [ ] `npm run test` result documented.
- [ ] `npm run build` result documented.
- [ ] `npm run test:simulation` result documented.

If a command fails:

- [ ] Copy the exact error into `progress.md`.
- [ ] Mark whether it is pre-existing or caused by Phase 2.5.
- [ ] Fix Phase 2.5-caused failures before proceeding.

---

# I. Acceptance Criteria

Phase 2.5 is complete only when:

- [ ] Metadata migration applies cleanly.
- [ ] Product Master metadata seed passes simulation.
- [ ] Existing Product Master screens still work.
- [ ] Metadata Prototype works for Product/Product Category/UOM.
- [ ] No service-role key is exposed in frontend.
- [ ] No broad generic write API is introduced.
- [ ] Typecheck, lint, test, build, and simulation results are documented.
- [ ] Warehouse remains deferred until metadata core is accepted.

---

# J. Recommended Next Work After Phase 2.5

Do not jump directly into Warehouse until this phase is verified.

Recommended order:

1. Stabilize metadata engine prototype.
2. Make Product Master fully metadata-driven.
3. Add safe generic read APIs.
4. Add generic master-data create/update only after audit + permission enforcement.
5. Design Warehouse metadata.
6. Build Warehouse on the metadata engine.
7. Build GRN UI with metadata, but post stock only through explicit transactional RPC/service.
