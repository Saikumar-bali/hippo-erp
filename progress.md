# Project Progress

This file tracks project phases and ownership. Only `tasks.md` contains the active implementation checklist.

## Current Direction

Hippo ERP is a Frappe/ERPNext-style company-level Inventory ERP built on React/Vite/TypeScript and Supabase. Frappe is architectural inspiration only. We do not install Frappe, run Frappe, or copy Frappe source code.

User-facing terminology should say **Company**, not Tenant. Existing `tenant_id` remains internal company context until a deliberate schema rename is planned.

## Phase Status

| Phase | Name | Status | Notes |
| --- | --- | --- | --- |
| 0 | Project scaffold and deployment foundation | Mostly complete | Platform-owned foundation exists. |
| 1 | Company profile, users, roles, permissions | Complete | Company profile, custom roles, permissions, and user-role assignment exist. |
| 2 | Product master data | Complete | Product Category, UOM, and Product/SKU flows exist. |
| 2.5 | Metadata-Driven ERP Core | Complete as renderer prototype | Metadata tables, Product Master metadata seed, dynamic renderers, and Product Master metadata UI exist. |
| 2.6 | Metadata Workspace, Navigation, and Compact ERP UI | Complete | Migration 0021 + 0022, grouped workspace sidebar, DynamicRouteRenderer, compact density, pagination, no duplicate Status column. Senior review fixes applied. |
| 2.7 | Metadata Studio / Developer Side | Complete | Permission manage_metadata, Metadata Studio workspace, read-only metadata inspection pages (DocTypes, DocFields, Workspaces, List Views, Form Layouts, etc.), audit_logs + change_requests tables, CRUD RLS on metadata tables, FK dropdowns in form. |
| 2.8 | Custom DocType Document Storage | Complete | Database: storage_strategy, erp_documents + erp_document_versions tables, 6 RPC functions with field validation + permission check + company scoping. Frontend: generic-doctype-api bridge, doctype-api-map auto-detection, DynamicListPage/DynamicDetailPage generic_json support, storage_strategy in DocType form. Applied + verified on Supabase Cloud. |
| 2.9 | Custom DocType Wizard UX | Complete | Guided 7-step wizard for end-to-end custom DocType creation. Creates DocType + DocFields + List View + Form Layout + DocType Actions + Workspace Item in Supabase Cloud. Metadata Studio home reorganized with wizard as primary action. |
| 2.10 | Custom DocType Wizard Hardening | Complete | Atomic bundle RPC, duplicate checks (doctype_key, route, workspace item), permission auto-provisioning (catalog + owner/admin grants), sidebar refresh, success checklist, simulation, real authenticated UI verification (create/list/update/deactivate). |
| 3 | Warehouse hierarchy | Complete | Metadata-driven 6-level hierarchy (Warehouse → Zone → Aisle → Rack → Shelf → Bin) with generic_json storage, Link field parent references with display templates, 25 permission keys granted to owner/admin, workspace sidebar items, migration 0028 applied on Supabase Cloud, browser UI verified (create hierarchy → edit → deactivate). |
| 3.1 | Metadata Studio UX Polish | Complete | Improved raw metadata tables (search, sticky header, JSON previews), grouped workspace items view, Metadata Studio home categorization, and responsive JSON editor dialog. |
| 4 | GRN + Inventory Receipt Architecture | Complete | Migrations 0030–0037 applied on Supabase Cloud. Full GRN lifecycle (create/edit/post/view/list), inventory read-only views, post confirmation dialog, client search, label enrichment, production-hardened RPCs (null→[], pagination), workspace visibility verified. |
| 4.5 | GRN Cancellation / Reversal Architecture | Architecture complete | Design document covers reversal rules, table changes, RPC design, permission, simulation, UI plan. No implementation. |
| 4.6 | GRN Cancellation / Reversal Implementation | Complete | Migration 0038, `wh_cancel_grn` RPC, CancelGrnDialog, frontend integration, simulation (12/12). Migration applied on Supabase Cloud. Verified E2E. |
| 4.7 | Manual App Builder + Permission Repair | Complete | DocType completion checklist, safe repair actions, manual Purchase Invoice guide, permission error UX, CRM feasibility doc, and simulation support added for metadata-driven manual app recovery. |
| 4.8 | Metadata Studio Builder UX | Complete | Builder-first Metadata Studio with dedicated DocType, Field, List View, Form Layout, Menu, and Access builders. Metadata sidebar items now open builders by default, raw tables live under advanced tools, and Purchase Invoice browser verification passed. |
| 4.9 | Builder Hardening + Generic Document Cleanup | Complete | Generic document `row_to_jsonb(record)` banner fixed via migration 0039, builder next-step guidance improved, and Purchase Invoice + Check/Repair browser verification passed. |

## Phase 4.1 Implementation Summary
**Status:** Backend foundation complete on Supabase Cloud.
**Final Commit:** `068ce35`

### Migrations Created

| Migration | Contents |
|-----------|---------|
| `0030_grn_inventory_tables.sql` | 5 physical tables (`wh.grns`, `wh.grn_lines`, `wh.inventory_batches`, `wh.inventory_movements`, `wh.current_inventory`); legacy table cleanup; expression index for nullable batch_id uniqueness; triggers |
| `0031_grn_permissions_workspace.sql` | 3 permission keys (`delete_grn`, `view_inventory_movements`, `view_current_inventory`); Purchasing workspace + GRN item activation; grants to 6 roles |
| `0032_grn_inventory_rls.sql` | RLS: SELECT for tenant members; ALL writes denied (SECURITY DEFINER RPCs only) |
| `0033_grn_inventory_rpcs.sql` | 5 RPCs (`wh_create_grn_draft`, `wh_update_grn_draft`, `wh_get_grn`, `wh_list_grns`, `wh_post_grn`); `wh.current_user_has_grn_permission` helper; service role bypass |

### Key Decisions
- FK references physical tables (`wh.products(id)`, `wh.units_of_measure(id)`, `wh.warehouse_bins(id)`)
- `batch_id` nullable with expression unique index (no sentinel batch)
- Audit columns nullable (auth.uid() returns NULL for Management API)
- No auto GRN numbering; caller-provided with per-tenant uniqueness validation

### Simulation Results (Supabase Cloud)
**12/12 tests PASSED.** See `tests/simulations/grn_inventory_receipt_flow.sql`.

### Frontend API
`src/lib/grn-api.ts` — minimal wrapper with `GrnHeader`, `GrnLine`, `GrnWithLines`, `GrnListResult` types.

### Verification Results
| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 33 warnings (pre-existing) |
| `npm run build` | Success |
| `npm run test` | 34 pass, 6 fail (pre-existing auth/mock failures) |
| `npm run test:simulation` | 11 simulation files (including GRN) |

### Remaining Gaps
- No auto GRN numbering
- No line-level approval or partial-receipt workflow

## Phase 4.2 Implementation Summary
**Status:** GRN UI foundation complete.
**Final Commit:** `e41a668`

### Files Created
- `supabase/migrations/0034_grn_ui_view.sql` — GRN list view RPC, supplier search case-insensitive
- `src/components/grn/GrnDraftFormPage.tsx` — Full create/edit GRN draft form with line grid (product, UOM, qty, batch, bin, expiry), supplier search dropdown
- `src/components/grn/GrnDetailPage.tsx` — Read-only GRN detail with line items
- `src/components/grn/GrnLineGrid.tsx` — Dynamic line item grid (add/remove rows, product+UOM selectors)
- `src/components/grn/GrnStatusBadge.tsx` — Colored status badge component
- `src/components/grn/GrnListPage.tsx` — GRN list page with status filtering
- `tests/frontend/grn-ui.spec.tsx` — Initial test suite

### Key Decisions
- Supplier is free-text input with typeahead search (not FK-constrained)
- Line items are fully dynamic (add/remove)
- No PO reference field (planned for future phase)

### Verification Results
| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 33 warnings (pre-existing) |
| `npm run build` | Success |
| `npm run test` | 34 pass, 6 fail (pre-existing) |

## Phase 4.3 Implementation Summary
**Status:** GRN UI hardening complete.
**Final Commit:** `73073fd`

### Files Created
- `docs/PHASE_4_3_GRN_UI_HARDENING.md` — design document
- `supabase/migrations/0036_inventory_list_rpcs.sql` — `wh_list_current_inventory` + `wh_list_inventory_movements` RPCs
- `src/lib/inventory-api.ts` — merged legacy re-exports + new RPC wrappers + types
- `src/components/grn/CurrentInventoryPage.tsx` — read-only current inventory view
- `src/components/grn/InventoryMovementsPage.tsx` — read-only movement ledger view

### Files Modified
- `src/components/grn/GrnDetailPage.tsx` — loads products/UOMs/bins for label enrichment
- `src/components/grn/GrnListPage.tsx` — client search, post confirmation dialog, posted GRN edit→view redirect, `line_count` type fix
- `src/components/metadata/DynamicRouteRenderer.tsx` — routes for `current_inventory` and `movements`
- `src/lib/grn-api.ts` — fixed `line_count` typing
- `tests/frontend/grn-ui.spec.tsx` — 8 tests matching current UI

### Key Decisions
- Inventory RPCs return `{ ok: true, data: [...] }` shape
- Current Inventory / Movements workspace items remain inactive (pending Phase 4.4 activation decision)

### Verification Results
| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 37 warnings (pre-existing) |
| `npm run build` | Success |
| `npm run test` | 42 pass, 6 fail (pre-existing) |

## Phase 4.4 Implementation Summary
**Status:** GRN + Inventory production hardening complete.
**Final Commit:** `771cf49`

### Files Created
- `docs/PHASE_4_4_GRN_INVENTORY_PRODUCTION_HARDENING.md` — design document
- `supabase/migrations/0037_inventory_list_rpcs_hardening.sql` — harden inventory list RPCs (null→[], pre-aggregation pagination)
- `docs/ai-runs/2026-06-01_phase-4-4-grn-inventory-hardening.md` — AI run report

### Files Modified
- `src/lib/inventory-api.ts` — reorganized: Phase 4.3+ read-only API at top, legacy helpers clearly marked @deprecated

### Key Decisions
- Migration 0037 replaces RPCs from 0036; COALESCE wraps jsonb_agg, LIMIT/OFFSET moved inside CTE
- Legacy helpers remain for backward-compatible imports, explicitly deprecated

### Supabase Cloud Verification
- `wh_list_current_inventory` returns `{"ok":true,"data":[]}` for empty result (not null)
- `wh_list_inventory_movements` returns `{"ok":true,"data":[]}` for empty result (not null)
- Current Inventory and Movements workspace items now active (is_active = true)

### Verification Results
| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 37 warnings (pre-existing) |

## Phase 4.5 Implementation Summary
**Status:** Architecture / Planning complete (no implementation).

### Files Created
- `docs/PHASE_4_5_GRN_CANCELLATION_REVERSAL_ARCHITECTURE.md` — full cancellation/reversal architecture document
- `docs/ai-runs/2026-06-01_phase-4-5-grn-cancellation-reversal-architecture.md` — AI run report

### Key Architecture Decisions
- Two-pass RPC (validate all lines → execute reversals) for atomicity
- Dedicated `cancel_grn` permission key (not generic `cancel_document`)
- `reversal_of_movement_id` column added to link reversal → original movement
- Block full cancellation if any line has insufficient stock
- `grn_status_events` audit table deferred (existing columns suffice)
- Batches soft-deactivated (`is_active = false`), never deleted

## Phase 4.6 Implementation Summary
**Status:** GRN cancellation / reversal implementation complete.
**Final Commit:** `c2aa2ee`

### Files Created
- `supabase/migrations/0038_grn_cancellation_reversal.sql` — table columns, `cancel_grn` permission, `wh_cancel_grn` RPC
- `src/components/grn/CancelGrnDialog.tsx` — reason dialog with confirmation
- `tests/simulations/grn_cancellation_reversal_flow.sql` — 12-test simulation
- `docs/ai-runs/2026-06-01_phase-4-6-grn-cancellation-reversal.md` — AI run report

### Files Modified
- `src/lib/grn-api.ts` — added `cancelGrn()` API wrapper
- `src/components/grn/GrnDetailPage.tsx` — Cancel button + cancelled info display
- `src/components/grn/InventoryMovementsPage.tsx` — REVERSAL rows styled (red bg, bold label)
- `scripts/run-simulation.cjs` — added cancellation flow entry

### Key Design Decisions
- `grn_lines` stores `batch_number` (text), not `batch_id` (uuid); RPC resolves batch_id from original movement
- Two-pass RPC: validate all lines first, then execute reversals
- Stock consumption guard locks `current_inventory` rows with `FOR UPDATE`
- Original movements unchanged (append-only design)

### Supabase Cloud Verification
- Migration 0038 applied. Columns verified. Permission seeded + granted.
- E2E: Post GRN (qty=15) → Cancel → Status=cancelled → Reversal movement (qty=-15, is_reversal=true) → Original unchanged → Current inventory 0 → Duplicate blocked → Empty reason blocked → Draft blocked.

### Verification Results
| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 37 warnings (pre-existing) |
| `npm run build` | Success |

### Remaining Gaps
- No PO reference in GRN (future phase)
- No partial reversal support
- No `grn_status_events` audit table (deferred)
- Insufficient-stock-with-consumption test requires outbound movement (future phase)

## Phase 4.7 Implementation Summary
**Status:** Check / Repair DocType self-diagnostic + user experience improvements.
**Final Commit:** `01e377b`

### Files Created
- `src/components/metadata/CheckRepairPanel.tsx` — Check/Repair UI panel with 6 diagnostic checks and Fix button
- `docs/MANUAL_DOCTYPE_CREATION_GUIDE.md` — step-by-step guide for creating Purchase Invoice manually from browser
- `docs/CRM_ON_METADATA_ENGINE.md` — feasibility analysis of CRM on metadata engine vs. custom RPCs
- `tests/simulations/manual_doctype_completion_flow.sql` — 8-test simulation for incomplete doctype → repair flow
- `tests/simulations/metadata_check_performance_plan.sql` — dry-run performance plan for check/repair diagnostics

### Files Modified
- `supabase/migrations/0028_warehouse_hierarchy_metadata.sql` — added `check_and_repair_doctype()` SQL function
- `src/components/metadata/DynamicListPage.tsx` — permission error detection + repair instructions
- `src/components/metadata/CardWorkspaceItem.tsx` — active-state highlight for workspace items
- `src/routes/metadataStudioRoutes.ts` — check-repair route

### Key Design Decisions
- `check_and_repair_doctype()` is a server-side SQL function in existing migration 0028 (no new migration)
- 6 diagnostic checks: DocType exists, fields exist, list view exists, form layout exists, actions exist, permissions+grants exist
- Fix auto-creates missing permission keys, grants them to owner/admin, and activates workspace items
- Permission error in DynamicListPage detected via `error.toLowerCase().includes("permission")` — shows repair instructions with link to Check/Repair
- Workspace items highlight when active (green left border, opacity change)

### Verification Results
| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |

### Remaining Gaps
- No automated frontend test for Check/Repair workflow
- Supabase CLI binary unavailable on win32-x64 — simulations require Linux/macOS or Supabase Cloud SQL Editor

## Phase 3.1 Implementation Summary
**Final Commit:** `d9e495b`

### Files Created
- `docs/PHASE_3_1_METADATA_STUDIO_UX_POLISH.md` — goals, requirements, and strategy for UX polish.
- `src/components/metadata-studio/WorkspaceItemsManager.tsx` — renamed and enhanced from `WorkspaceItemsView.tsx` with grouping and filters.

### Files Modified
- `src/components/metadata-studio/MetadataDataTable.tsx` — added search, filtered row count, sticky headers, better JSON previews, and tooltips.
- `src/components/metadata-studio/MetadataStudioHome.tsx` — reorganized layout with Quick Access cards and Advanced Metadata Tables section.
- `src/components/metadata-studio/MetadataFormDialog.tsx` — improved responsiveness and added monospace JSON validation helper.
- `src/components/metadata-studio/WorkspaceMetadataList.tsx` — updated to use `WorkspaceItemsManager`.

### UX Improvements
- **MetadataDataTable:** Global search across visible columns, sticky header for long lists, compact enterprise density, and smart JSON previews ("N items", "{...}") that reveal full content on hover.
- **WorkspaceItemsManager:** Grouped rows by `workspace_key` with item counts, advanced filtering (Workspace, Item Type, Active Status), and badge-based status indicators.
- **Metadata Studio Home:** Clear hierarchy prioritizing wizards over raw tables, with quick links to the most common configuration objects.
- **MetadataFormDialog:** Monospace labels for JSON fields with character count and clear error messaging for invalid syntax.

### Verification Results
| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** (pre-existing warnings only) |
| `npm run build` | **PASS** |
| `npm run test` | 31 pass, 6 fail (pre-existing in auth/user-roles) |

### Remaining Gaps
- Visual List View Builder (planned).
- Visual Form Layout Builder (planned).
- Advanced JSON editor (e.g. Monaco) for complex configurations.

## Phase 2.6 Implementation Summary

### Files Created
- `supabase/migrations/0021_workspace_navigation_core.sql` — workspace tables, RLS, seeds
- `src/lib/metadata/workspace-types.ts` — types for workspace metadata
- `src/lib/metadata/workspace-api.ts` — Supabase queries for workspaces
- `src/hooks/useWorkspaceNavigation.ts` — hook to load + filter workspace tree
- `src/components/layout/AppShell.tsx` — layout wrapper
- `src/components/layout/WorkspaceSidebar.tsx` — grouped sidebar
- `src/components/layout/WorkspaceGroup.tsx` — expandable workspace group
- `src/components/layout/WorkspaceItem.tsx` — clickable nav item
- `src/components/layout/TopBar.tsx` — compact topbar
- `src/components/metadata/DynamicRouteRenderer.tsx` — replaces hardcoded App.tsx branches
- `docs/flow.md` — data/component flow documentation
- `tests/simulations/workspace_navigation_flow.sql` — workspace simulation tests

### Files Modified
- `src/App.tsx` — now uses AppShell + WorkspaceSidebar + DynamicRouteRenderer (no hardcoded Product/Product Category/UOM branches)
- `src/styles.css` — compact enterprise UI tokens (10px xs, 11px sm, 12px md, 14px lg fonts; 200px sidebar; 36px topbar; 28px rows; 26px controls; 8px padding), workspace sidebar styles, pagination styles
- `src/components/metadata/DynamicListPage.tsx` — removed duplicate Status column, added pagination (20/page)
- `src/components/metadata/DynamicRouteRenderer.tsx` — review fix: per-doctype permissions from config.actions
- `scripts/run-simulation.cjs` — added workspace navigation simulation
- `docs/METADATA_ENGINE.md` — added Phase 2.6 section

### Files Added (Review Fixes)
- `supabase/migrations/0022_workspace_schema_refine.sql` — adds `target_doctype_key`, `target_workspace_key`, `route` columns, CHECK constraint

### Senior Review Findings (2026-05-30)
| # | Issue | Fix |
|---|-------|-----|
| 1 | DynamicRouteRenderer uses hardcoded `update_product`/`delete_product` for all doctypes | Resolved via `useDocTypeConfig(config.actions)` — checks per-doctype `action_key`/`permission_key` pairs |
| 2 | Workspace schema lacks explicit `target_doctype_key`, `target_workspace_key`, `route` columns | Migration 0022 adds columns + backfill + CHECK constraint |
| 3 | Simulation lacks real blocked-write checks | Replaced structural-only check with `BEGIN`/`EXCEPTION` blocks attempting INSERT/UPDATE/DELETE |
| 4 | Anonymous-read verification limitation undocumented | Added note explaining SQL Editor runs as superuser; full anon simulation requires separate client session |
| 5 | tasks.md/progress.md contradictions | tasks.md checked off all implemented items; progress.md marked "Review in progress" |

### Verification Results (2026-05-30 — review fixes)
| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 24 warnings (pre-existing) |
| `npm run test` | 31 pass, 6 fail (pre-existing) |
| `npm run build` | Success |
| Supabase Cloud simulation (workspace_navigation_flow) | **PASSED** — all 9 checks pass (tables exist, seeds correct, RLS enabled, new columns populated, blocked-writes verified as authenticated role) |

## Phase 2.7 Implementation Summary

### Files Created
- `docs/PHASE_2_7_METADATA_STUDIO.md` — architecture documentation for two-sided architecture
- `supabase/migrations/0023_metadata_studio_foundation.sql` — manage_metadata permission, audit_logs + change_requests tables, Metadata Studio workspace seed, updated create_company_role function
- `src/lib/metadata/metadata-studio-api.ts` — API functions for listing all metadata tables
- `src/components/metadata-studio/MetadataStudioHome.tsx` — Metadata Studio home screen with navigation grid
- `src/components/metadata-studio/MetadataDataTable.tsx` — reusable read-only data table component
- `src/components/metadata-studio/DocTypeList.tsx` — DocTypes inspection page
- `src/components/metadata-studio/DocTypeDetail.tsx` — DocType details inspection
- `src/components/metadata-studio/DocFieldList.tsx` — DocFields inspection page
- `src/components/metadata-studio/WorkspaceMetadataList.tsx` — Workspaces + Workspace Items inspection
- `src/components/metadata-studio/ListViewMetadataList.tsx` — List Views + DocType Actions inspection
- `src/components/metadata-studio/FormLayoutMetadataList.tsx` — Form Layouts + Naming Series + Workflows inspection
- `tests/simulations/metadata_studio_foundation_flow.sql` — simulation for Phase 2.7 foundation

### Files Modified
- `src/components/metadata/DynamicRouteRenderer.tsx` — routes Metadata Studio page items to studio components
- `scripts/run-simulation.cjs` — added metadata studio simulation

### Verification Results (2026-05-30)
| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 25 warnings (pre-existing + 1 new from MetadataDataTable pattern) |
| `npm run test` | 31 pass, 6 fail (pre-existing) |
| `npm run build` | Success |
| Supabase Cloud simulation (metadata_studio_foundation_flow) | **PASSED** — all 9 checks pass |

## Phase 2.9 Implementation Summary

### Files Created
- `docs/PHASE_2_9_CUSTOM_DOCTYPE_WIZARD.md` — architecture doc with wizard design, validation, checklist
- `src/components/metadata-studio/CustomDocTypeWizard.tsx` — 7-step guided wizard (450 lines)
- `tests/simulations/custom_doctype_wizard_flow.sql` — end-to-end simulation creating supplier_test

### Files Modified
- `src/components/metadata-studio/MetadataStudioHome.tsx` — "Create Custom DocType" primary button, "Advanced Metadata Tables" section
- `src/components/metadata/DynamicRouteRenderer.tsx` — wizard route `metadata_studio_wizard`
- `scripts/run-simulation.cjs` — added Phase 2.8 and 2.9 simulation file references

### Wizard Steps
1. **Basic Info** — label, auto-generated snake_case key, module, route, storage strategy, company scoped
2. **Fields** — add/edit/remove fields with auto-generated fieldnames, 9 field types
3. **List View** — auto-generated columns from in_list_view fields
4. **Form Layout** — auto-generated Basic Info section with all fields
5. **Actions** — read/create/update/deactivate permission mapping
6. **Workspace** — workspace selection + sidebar item creation
7. **Preview & Create** — summary + inserts all metadata rows in Supabase Cloud

### Verification Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 29 warnings (pre-existing) |
| `npm run test` | 31 pass, 6 fail (pre-existing) |
| `npm run build` | Success |
| `npm run test:simulation` | All 8 simulation files found |

### Supabase Cloud Simulation (custom_doctype_wizard_flow)
| Check | Result |
|-------|--------|
| Module exists | PASS |
| DocType inserted (generic_json) | PASS |
| 5 DocFields inserted | PASS |
| List View created | PASS |
| Form Layout created | PASS |
| 4 DocType Actions created | PASS |
| Workspace Item created | PASS |
| FullDocTypeConfig verified | PASS |
| erp_create_document RPC | INFO (needs auth context) |
| erp_list_documents RPC | INFO (needs auth context) |

## Phase 2.8 Implementation Summary

### Database

- `supabase/migrations/0026_custom_doctype_storage.sql` — adds `storage_strategy` column to `erp_doctypes`, creates `app.erp_documents` + `app.erp_document_versions` with RLS, `public.current_user_has_doctype_permission` helper, 6 RPC functions for generic document CRUD with field validation and company scoping.
- Applied to Supabase Cloud — all objects verified.

### Frontend

- `src/lib/metadata/types.ts` — added `storage_strategy` to `DocTypeMeta`
- `src/lib/metadata/generic-doctype-api.ts` — bridge wrapping 6 RPC calls for generic JSON documents
- `src/components/metadata/doctype-api-map.ts` — `detectAndRegisterGenericDocTypeApi()` auto-registers API for `generic_json` doctypes; `get` signature updated with optional `tenantId`
- `src/components/metadata/DynamicListPage.tsx` — auto-detects generic_json when API is null
- `src/components/metadata/DynamicDetailPage.tsx` — auto-detects generic_json + passes tenantId
- `src/lib/metadata/metadata-studio-api.ts` — `storage_strategy` select field in DocType form

### Verification Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 29 warnings (pre-existing) |
| `npm run build` | Success |
| Supabase Cloud simulation (custom_doctype_storage_flow) | 9/9 PASS |

### Supabase Cloud Verification (all PASS)
| Check | Result |
|-------|--------|
| manage_metadata permission exists | 1 |
| manage_metadata granted to owner | 1 |
| manage_metadata granted to admin | 1 |
| erp_audit_logs table exists | 1 |
| erp_metadata_change_requests table exists | 1 |
| RLS enabled on audit_logs | 1 |
| RLS enabled on change_requests | 1 |
| Metadata Studio workspace exists | 1 |
| Metadata Studio items (9 total) | 9 |

### Remaining Gaps
- Generic document write API not implemented (intentional).
- Warehouse CRUD not started (Phase 3).
- Workflow transition engine not implemented.
- Naming series generation engine not implemented.
- Metadata Studio edit/create forms (raw table editing remains available via MetadataDataTable).
- DynamicListPage needs better empty state design for no-data vs no-matches.
- Full anon-read verification requires separate anon-key client session (SQL Editor always runs as service_role).
- Sort from `sort_json` not yet wired to DynamicListPage (default sort used).
- Wizard does not auto-create naming series or workflow for new DocTypes.
- Permission keys mapped by wizard do not auto-create role permissions.
