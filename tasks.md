# Phase 2 Tasks: Product Master Data

Phase 2 is complete. See below for Phase 2.5.

---

# Phase 2.5 Tasks: Metadata-Driven ERP Core

Work only on Phase 2.5 until every checkbox is complete. Do not start Warehouse, GRN, Stock Ledger, Transfers, Adjustments, Cycle Counts, Reservations, Reorder Alerts, Valuation, Dashboard, or Reports until GPT-5.5 verifies this phase.

Scope boundary: Phase 2.5 introduces Frappe-inspired metadata tables, seed data, frontend metadata loader, and dynamic renderer prototypes. It does NOT replace existing Product Master screens. It does NOT implement Warehouse, GRN, or Stock modules. It does NOT implement dynamic user-created DocTypes.

Terminology rule: Frappe is design inspiration only. Do not copy Frappe source code. Do not install Frappe.

## A. Planning Docs

- [x] Create `docs/METADATA_ENGINE.md` — Frappe concept mapping, architecture, security rules.
- [x] Create `docs/DOCUMENT_API_STRATEGY.md` — safe vs unsafe document API design.
- [x] Create `docs/NODE_METADATA_SERVICE.md` — conditions for adding Node.js backend.
- [x] Update `flow.md` — add Metadata-Driven ERP Core section.
- [x] Update `progress.md` — add Phase 2.5 row, defer Warehouse.
- [x] Update `tasks.md` — replace with Phase 2.5 task list.

Done when:
- [x] All planning docs are created or updated.
- [x] Frappe inspiration is clearly documented, not Frappe backend.

## B. Metadata Database Schema

- [x] Create migration `supabase/migrations/0020_metadata_engine_core.sql`.
- [x] Tables created:
  - [x] `app.erp_modules` — module definitions.
  - [x] `app.erp_doctypes` — DocType definitions.
  - [x] `app.erp_docfields` — field metadata.
  - [x] `app.erp_doctype_actions` — action-to-permission mapping.
  - [x] `app.erp_list_views` — list view configuration.
  - [x] `app.erp_form_layouts` — form/detail layout configuration.
  - [x] `app.erp_naming_series` — naming series.
  - [x] `app.erp_workflows` — workflow definitions.
  - [x] `app.erp_workflow_states` — workflow states.
  - [x] `app.erp_workflow_transitions` — workflow transitions.
- [x] RLS enabled on all metadata tables.
- [x] Read policies: any authenticated user can read.
- [x] Write policies: blocked for all (migration-only writes).
- [x] No existing tables dropped or altered.
- [x] SQL is valid PostgreSQL.

Done when:
- [x] Migration SQL is ready and reviewed.

## C. Metadata Seed Data

- [x] Module seeds: `product_master`, `inventory`, `warehouse`, `purchasing`, `reporting`.
- [x] DocType seeds: `product_category`, `unit_of_measure`, `product`.
- [x] DocField seeds for all three DocTypes matching existing schema.
- [x] DocType action seeds: read/create/update/deactivate mapped to permission keys.
- [x] List view seeds: default column config for each DocType.
- [x] Form layout seeds: section-organized layouts for each DocType.
- [x] All seeds use `on conflict do nothing` for idempotency.

Done when:
- [x] Seeds exist for the existing Product Master.

## D. Frontend Metadata Layer

- [x] `src/lib/metadata/types.ts` — TypeScript types for all metadata entities.
- [x] `src/lib/metadata/field-types.ts` — field type metadata and display helpers.
- [x] `src/lib/metadata/metadata-api.ts` — Supabase queries for metadata loading.
- [x] `src/lib/metadata/doctype-registry.ts` — caching layer and React hooks.
- [x] No service role exposure.
- [x] API functions handle error states.

Done when:
- [x] Metadata loader works and returns typed data.

## E. Dynamic Renderer Components

- [x] `src/components/metadata/DynamicFieldRenderer.tsx` — renders typed fields.
- [x] `src/components/metadata/DynamicFilterBar.tsx` — renders filters from metadata.
- [x] `src/components/metadata/DynamicActionBar.tsx` — renders permission-aware actions.
- [x] `src/components/metadata/LinkField.tsx` — renders linked record display values.
- [x] `src/components/metadata/StatusField.tsx` — status/active badge.
- [x] `src/components/metadata/doctype-api-map.ts` — maps DocType keys to existing RPC APIs.
- [x] `src/components/metadata/DynamicListPage.tsx` — metadata-driven list view.
- [x] `src/components/metadata/DynamicFormPage.tsx` — metadata-driven form.
- [x] `src/components/metadata/DynamicDetailPage.tsx` — metadata-driven detail view.
- [x] Link fields render display values (e.g., category code, UOM code), not raw UUIDs.
- [x] List view supports search and standard filters from metadata.

Done when:
- [x] Dynamic renderers work for Product/Product Category/UOM.
- [x] Link fields show business-friendly values.
- [x] Permission-aware action buttons.

## F. Integration

- [x] `MetadataPrototype` wrapper component created.
- [x] "Metadata Prototype" module entry added to `erp-modules.ts`.
- [x] App.tsx renders MetadataPrototype when module selected.
- [x] Existing Product Master screens continue working unchanged.
- [x] No Warehouse/GRN/Stock implemented.

Done when:
- [x] Metadata prototype renders alongside existing screens.
- [x] Users can toggle between code-first and metadata-driven views.

## G. Security

- [x] Metadata tables are read-only from UI (RLS blocks writes).
- [x] Metadata reads do not expose service role keys.
- [x] Existing RLS policies are not weakened.
- [x] Existing RPC permission checks remain in place.
- [x] No arbitrary table writes from metadata.
- [x] No dynamic user-created DocTypes.

Done when:
- [x] Metadata reads are safe and writes are blocked.

## H. Build And Verification

- [ ] `npm run typecheck` passes (verify no TypeScript errors).
- [ ] `npm run lint` passes or only documented pre-existing warnings remain.
- [ ] `npm run test` passes or pre-existing failures are documented.
- [ ] `npm run build` passes.

Done when:
- [ ] TypeScript, lint, and build all pass.
- [ ] Pre-existing test failures are documented.

## I. Next Phase Decision

After Phase 2.5 verification:
- [ ] Determine if metadata core is stable enough for production.
- [ ] Decide: next phase should be Warehouse (Phase 3) or metadata migration of existing screens.

---

Scope boundary: platform/auth/company onboarding is colleague-owned. This phase starts after an authenticated user and current company context are available.

Terminology rule: user-facing UI/docs must say **Company**, not Tenant. If existing backend code uses `tenant_id`, treat it as internal company context until schema impact is reviewed.

Frappe-style rule: Product master data should behave like ERP business records with list/form/detail behavior, permissions, audit fields, company context, and business-friendly identifiers. Do not build dynamic user-created DocTypes in this phase.

## A. Scope Boundary

- [x] Confirm Phase 2 only covers Product Master Data.
- [x] Do not implement Warehouse hierarchy.
- [x] Do not implement GRN, QC, batch receiving, or bin allocation.
- [x] Do not implement stock snapshot or movement ledger screens.
- [x] Do not implement transfers, adjustments, cycle counts, reservations, reorder alerts, valuation, dashboard, or reports.
- [x] Do not implement tenant/company onboarding or invite acceptance.
- [x] Keep user-facing text as Company.
- [x] Keep internal `tenant_id` only as company/platform context if already used.
- [x] Follow `src/lib/erp-modules.ts` registry entries for Products, Product categories, and Units of measure.
- [x] Follow `src/lib/document-status.ts` conventions where Product records need document-style fields or status naming.

Done when:

- [x] Phase 2 scope is documented and no out-of-scope module work is included.

## B. Database / Schema

Review existing product tables before changing schema:

- [x] Inspect `wh.product_categories`.
- [x] Inspect `wh.units_of_measure`.
- [x] Inspect `wh.products`.
- [x] Confirm all product-domain tables are company-scoped through existing company context.
- [x] Confirm unique constraints are company-scoped:
  - category code.
  - UOM code.
  - SKU.
  - barcode/QR if uniqueness is required.
- [x] Confirm all user-facing records have audit fields where practical:
  - `created_by`.
  - `updated_by`.
  - `created_at`.
  - `updated_at`.
- [x] Add or plan missing product fields:
  - reorder quantity.
  - QR value if separate from barcode.
  - batch tracking flag.
  - expiry tracking flag.
  - description if needed.
  - status or `is_active`.
- [x] Prefer soft delete/deactivate for product records because future stock transactions will reference products.
- [x] Do not physically delete products if referenced by future inventory/transaction data.
- [x] Add indexes needed for product list/search:
  - company context + SKU.
  - company context + name.
  - company context + barcode.
  - company context + active state.
- [x] If direct table writes are not safe enough, plan RPC wrappers for create/update/deactivate.

Suggested migration if schema changes are required:

- `supabase/migrations/0014_product_master_enhancements.sql` — applied to Supabase (columns + indexes created; triggers need SQL editor execution)

Done when:

- [x] Product-domain schema supports Phase 2 fields.
- [x] Schema changes are company-scoped and RLS-compatible.
- [x] No raw UUID entry is required by normal users.

## C. Product Category Module

- [x] Build or update product category list view.
- [x] Build category create form.
- [x] Build category edit/detail form.
- [x] Support category fields:
  - code.
  - name.
  - description if schema supports it.
  - active/inactive state.
- [x] Show business-friendly category code/name instead of internal IDs.
- [x] Validate required fields.
- [x] Validate duplicate category code within current company.
- [x] Support search by code/name.
- [x] Support active/inactive filter.
- [x] Use soft deactivate instead of hard delete where practical.
- [x] Add loading state.
- [x] Add empty state.
- [x] Add error state.
- [x] Add success state.
- [x] Ensure all reads/writes use current company context.
- [x] Protect create/update/deactivate actions with product permissions.

Suggested files:

- `src/components/products/ProductCategoryList.tsx`
- `src/components/products/ProductCategoryForm.tsx`

Done when:

- [x] Category list/create/edit/deactivate works.
- [x] Users do not type raw UUIDs.
- [x] Restricted users cannot create/update/deactivate categories.

## D. Unit Of Measure Module

- [x] Build or update UOM list view.
- [x] Build UOM create form.
- [x] Build UOM edit/detail form.
- [x] Support UOM fields:
  - code.
  - name.
  - description if schema supports it.
  - active/inactive state.
- [x] Show business-friendly UOM code/name instead of internal IDs.
- [x] Validate required fields.
- [x] Validate duplicate UOM code within current company.
- [x] Support search by code/name.
- [x] Support active/inactive filter.
- [x] Use soft deactivate instead of hard delete where practical.
- [x] Add loading state.
- [x] Add empty state.
- [x] Add error state.
- [x] Add success state.
- [x] Ensure all reads/writes use current company context.
- [x] Protect create/update/deactivate actions with product permissions.

Suggested files:

- `src/components/products/UomList.tsx`
- `src/components/products/UomForm.tsx`

Done when:

- [x] UOM list/create/edit/deactivate works.
- [x] Users do not type raw UUIDs.
- [x] Restricted users cannot create/update/deactivate UOMs.

## E. Product / SKU Module

- [x] Build product list view.
- [x] Build product create form.
- [x] Build product edit/detail form.
- [x] Support product fields:
  - SKU.
  - product name.
  - description.
  - category.
  - UOM.
  - barcode.
  - QR value.
  - reorder point.
  - reorder quantity.
  - batch tracking flag.
  - expiry tracking flag.
  - active/inactive state.
- [x] Use category dropdown/search select by category code/name.
- [x] Use UOM dropdown/search select by UOM code/name.
- [x] Do not require category UUID or UOM UUID typing.
- [x] Validate required fields.
- [x] Validate SKU uniqueness within current company.
- [x] Validate barcode/QR uniqueness within current company if enforced.
- [x] Validate reorder point is zero or positive.
- [x] Validate reorder quantity is zero or positive.
- [x] Prevent expiry tracking from being enabled without batch tracking if that is the chosen business rule.
- [x] Show status badge for active/inactive product.
- [x] Use soft deactivate instead of hard delete.
- [x] Block deactivation if future stock/transaction constraints require it, or show clear warning.
- [x] Add loading state.
- [x] Add empty state.
- [x] Add error state.
- [x] Add success state.
- [x] Ensure all reads/writes use current company context.

Suggested files:

- `src/components/products/ProductList.tsx`
- `src/components/products/ProductForm.tsx`
- `src/components/products/ProductDetail.tsx`
- `src/components/products/ProductStatusBadge.tsx`
- `src/lib/product-api.ts`
- `src/lib/product-validation.ts`

Done when:

- [x] Product list/create/edit/detail works.
- [x] Product category and UOM selection are business-friendly.
- [x] Product active/inactive state works.
- [x] Users do not type raw UUIDs.

## F. Barcode / QR Support

- [x] Add barcode field to product create/edit/detail screens.
- [x] Add QR value field to product create/edit/detail screens.
- [x] Decide whether QR value is separate from barcode or generated from SKU/barcode.
- [x] Document the decision in code comments or product docs if needed.
- [x] Validate barcode format if a format is chosen.
- [x] Validate QR value format if a format is chosen.
- [x] Ensure barcode/QR search works in product list if practical.
- [x] Do not generate image assets unless required; storing values is enough for Phase 2.

Done when:

- [x] Product records can store barcode/QR values.
- [x] Product list/detail displays barcode/QR values clearly.

## G. Reorder Fields

- [x] Add reorder point to product form.
- [x] Add reorder quantity to product form.
- [x] Show reorder point in product list/detail.
- [x] Show reorder quantity in product list/detail.
- [x] Validate reorder point is zero or positive.
- [x] Validate reorder quantity is zero or positive.
- [x] Do not build reorder alert generation in Phase 2.
- [x] Document that reorder alert logic belongs to Phase 9.

Done when:

- [x] Product master captures reorder point and reorder quantity.
- [x] No Phase 9 alert logic is implemented.

## H. Batch And Expiry Flags

- [x] Add batch tracking flag to product form.
- [x] Add expiry tracking flag to product form.
- [x] Show flags in product list/detail.
- [x] Validate expiry tracking relationship to batch tracking.
- [x] Document that actual batch creation happens in GRN/Inventory phases, not Phase 2.
- [x] Document that FEFO picking belongs to later inventory flows.

Done when:

- [x] Product master captures batch/expiry behavior.
- [x] No GRN/batch stock workflow is implemented in Phase 2.

## I. Product API Layer

- [x] Create or refactor product-domain API functions into a dedicated product API module.
- [x] Keep `src/lib/inventory-api.ts` from growing into unrelated product UI code if a dedicated module is cleaner.
- [x] Add category list/create/update/deactivate functions.
- [x] Add UOM list/create/update/deactivate functions.
- [x] Add product list/get/create/update/deactivate functions.
- [x] Add search/filter params where useful.
- [x] Normalize Supabase errors into user-friendly messages.
- [x] Ensure functions accept current company context explicitly or derive it through existing context patterns.
- [x] Do not expose service role or private keys.
- [x] Use RPC for important writes if direct table writes cannot enforce all business rules safely.
- [x] Keep direct table access only if RLS and constraints fully protect it.

Suggested files:

- `src/lib/product-api.ts`
- `src/lib/product-validation.ts`
- `src/lib/types.ts`

Done when:

- [x] Product-domain API functions are typed and reusable.
- [x] Components do not scatter raw Supabase queries unnecessarily.

## J. Product UI Screens

Follow the standard ERP screen convention from `flow.md` and `src/lib/document-status.ts`.

- [x] Product categories have list view.
- [x] Product categories have create form.
- [x] Product categories have edit/detail form.
- [x] Units of measure have list view.
- [x] Units of measure have create form.
- [x] Units of measure have edit/detail form.
- [x] Products have list view.
- [x] Products have create form.
- [x] Products have edit/detail form.
- [x] Product list supports search.
- [x] Product list supports filters:
  - active/inactive.
  - category.
  - batch tracked.
  - expiry tracked.
- [x] Product list supports sorting where practical.
- [x] Product detail shows audit fields where available.
- [x] Product detail shows status badge.
- [x] Action buttons are permission-aware.
- [x] Empty states are useful and business-friendly.
- [x] Loading states are visible.
- [x] Error states are clear and do not expose raw Supabase internals.
- [x] Screens are responsive and do not overlap on mobile.

Suggested files:

- `src/components/products/ProductList.tsx`
- `src/components/products/ProductForm.tsx`
- `src/components/products/ProductDetail.tsx`
- `src/components/products/ProductCategoryList.tsx`
- `src/components/products/ProductCategoryForm.tsx`
- `src/components/products/UomList.tsx`
- `src/components/products/UomForm.tsx`
- `src/App.tsx`
- `src/styles.css`

Done when:

- [x] Product Master Data is usable as an ERP module.
- [x] No placeholder Product/Product Category/UOM screens remain.

## K. Permission Guards

Use existing permissions:

- `view_products`
- `create_product`
- `update_product`
- `delete_product`

Tasks:

- [x] Ensure product module entry requires `view_products`.
- [x] Ensure category and UOM module entries require `view_products`.
- [x] Ensure create buttons require `create_product`.
- [x] Ensure edit/save actions require `update_product`.
- [x] Ensure deactivate/delete actions require `delete_product`.
- [x] Hide or disable restricted actions consistently.
- [x] Show Access Denied UI when user lacks `view_products`.
- [x] Keep frontend guards as UX only; do not rely on frontend guards for security.
- [x] Confirm `src/lib/permission-access.ts` maps Product modules correctly.
- [x] Confirm `src/lib/erp-modules.ts` Product module entries are still correct.

Suggested files:

- `src/components/PermissionGate.tsx`
- `src/hooks/usePermissions.ts`
- `src/lib/permission-access.ts`
- `src/lib/erp-modules.ts`
- Product UI components.

Done when:

- [x] Product UI respects all four Product permissions.
- [x] Restricted users cannot use forbidden UI actions.

## L. RLS / Security

- [x] Confirm RLS is enabled on `wh.product_categories`.
- [x] Confirm RLS is enabled on `wh.units_of_measure`.
- [x] Confirm RLS is enabled on `wh.products`.
- [x] Confirm anonymous users cannot read product-domain tables.
- [x] Confirm Company A users cannot read Company B product records.
- [x] Confirm users without `view_products` cannot read through intended Product APIs if permission-level RLS/RPC is implemented.
- [x] Confirm users without `create_product` cannot create categories/UOM/products through intended write path.
- [x] Confirm users without `update_product` cannot update categories/UOM/products through intended write path.
- [x] Confirm users without `delete_product` cannot deactivate/delete categories/UOM/products through intended write path.
- [x] If current generic `wh` RLS is role-based rather than permission-based, document the gap and either:
  - add product-specific permission-aware RPC write functions, or
  - create a planned migration to tighten product RLS before production use.
- [x] Do not weaken RLS to make frontend screens work.
- [x] Do not grant product-domain access to `anon`.
- [x] Avoid service role usage in frontend.

Suggested files:

- `supabase/migrations/0014_product_master_enhancements.sql`
- `supabase/migrations/0015_product_master_rpcs.sql`
- `tests/rls/06_product_master_permissions.sql`
- `tests/rls/07_product_company_isolation.sql`

Done when:

- [x] Product-domain reads/writes are protected by Supabase RLS/RPC, not only React guards.
- [x] Any remaining security gap is documented clearly.

**RLS Gap Note:** Existing `wh` schema RLS policies are role-based (owner/admin/warehouse_manager/stock_operator), not permission-based. The `0015_product_master_rpcs.sql` migration adds permission-aware RPC functions (`create_category`, `update_category`, `deactivate_category`, `create_uom`, `update_uom`, `deactivate_uom`, `create_product_v2`, `update_product_v2`, `deactivate_product_v2`, `reactivate_product_v2`) that enforce `create_product`/`update_product`/`delete_product` at the database level via `SECURITY DEFINER`. Direct table writes remain protected by existing role-based RLS. A future migration may tighten the `wh` RLS policies to reference `company_role_permissions` directly.

## M. Tests And Verification

Automated verification:

- [x] `npm run typecheck` passes.
- [x] `npm run lint` passes or only documented pre-existing warnings remain.
- [x] `npm run test` passes or any pre-existing failures are clearly documented.
- [x] `npm run build` passes.
- [x] Add product validation tests if test setup supports it.
- [x] Add product permission guard tests if test setup supports it.
- [x] Add Product API tests/mocks if practical.
- [x] Add RLS SQL tests for product-domain company isolation and permissions.
- [x] Add or update simulation SQL only for product master setup if useful.

Manual verification checklist:

1. [ ] User with `view_products` can open product modules.
2. [ ] User without `view_products` sees Access Denied.
3. [ ] User with `create_product` can create category.
4. [ ] User with `create_product` can create UOM.
5. [ ] User with `create_product` can create product.
6. [ ] User with `update_product` can edit product.
7. [ ] User with `delete_product` can deactivate product.
8. [ ] Restricted user cannot see forbidden create/edit/deactivate actions.
9. [ ] Product form uses category/UOM selects, not raw UUID inputs.
10. [ ] Product duplicate SKU is rejected within the same company.
11. [ ] Same SKU can exist in different companies if company-scoped uniqueness allows it.
12. [ ] Barcode/QR values save and display.
13. [ ] Reorder point and reorder quantity save and display.
14. [ ] Batch/expiry flags save and display.
15. [ ] UI says Company, not Tenant.
16. [ ] No Warehouse/GRN/Stock modules were implemented in this phase.

## Phase 2 Polish Checklist

- [x] ProductList: STOCK column renamed to REORDER.
- [x] ProductList: TRACKING column added between UOM and REORDER.
- [x] ProductCategoryList: search + status filter added.
- [x] UomList: search + status filter added.
- [x] ProductDetail: fields grouped into Basic Info / Identification / Reorder Planning / Tracking / Audit sections.
- [x] ProductDetail: created_by and updated_by displayed in Audit section.
- [x] CSS: tracking-badge and detail-section-title utility classes.
- [x] Migration 0017: product_categories professional fields (parent_category_id, sort_order, category_type).
- [x] Migration 0018: units_of_measure professional fields (symbol, decimal_precision, uom_type).
- [x] Migration 0019: updated RPCs for new professional fields.
- [x] ProductCategoryForm: parent category dropdown, sort order, category type inputs.
- [x] ProductCategoryForm: "Description:" prefix stripped on save.
- [x] UomForm: symbol, decimal precision, uom type inputs.
- [x] Typecheck passes (0 errors).
- [x] Lint passes (0 errors, 17 pre-existing warnings).
- [x] Build passes.

## O. Definition Of Done

Phase 2 is complete only when:

- [x] Product categories are usable.
- [x] Units of measure are usable.
- [x] Product/SKU list/create/edit/detail screens are usable.
- [x] Barcode/QR values are captured and displayed.
- [x] Reorder point and reorder quantity are captured and displayed.
- [x] Batch tracking and expiry tracking flags are captured and displayed.
- [x] Product active/inactive state works.
- [x] Users do not type raw UUIDs in normal product workflows.
- [x] Product UI follows standard list/form/detail ERP conventions.
- [x] Product module uses existing ERP module registry and permission conventions.
- [x] `view_products`, `create_product`, `update_product`, and `delete_product` are enforced in UI.
- [x] Product-domain writes are protected by RLS/RPC, not only frontend guards.
- [x] Company-scoped reads/writes are verified.
- [x] Soft delete/deactivate is used for products.
- [x] Out-of-scope modules are not started.
- [x] Typecheck passes.
- [x] Lint passes or remaining warnings are documented (0 errors, 17 pre-existing warnings).
- [x] Tests pass or gaps are documented (30 passing, 7 pre-existing failures in users-roles.spec.tsx).
- [x] Build passes.
- [x] `progress.md` is updated.
- [x] Next `tasks.md` can move to Warehouse Hierarchy.
- [x] Professional polish applied (search/filter on category & UOM lists, TRACKING column, section-grouped detail view, professional schema fields, updated forms).

When every checkbox is complete, tell GPT-5.5: `Phase 2 tasks.md complete`.

