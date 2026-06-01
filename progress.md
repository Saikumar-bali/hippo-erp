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
| 4+ | GRN, stock ledger, transactions, reports | Pending | Must use explicit safe business services for stock-changing actions. |

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
