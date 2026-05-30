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
| 2.7 | Metadata Studio / Developer Side | In Progress | Permission manage_metadata, Metadata Studio workspace, read-only metadata inspection pages (DocTypes, DocFields, Workspaces, List Views, Form Layouts, etc.), audit_logs + change_requests tables. |
| 3 | Warehouse hierarchy | On Hold | Do not start until Phase 2.7 is verified. |
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
- User-created DocType builder UI not implemented.
- Metadata Studio edit/create forms (read-only only in this phase).
- DynamicListPage needs better empty state design for no-data vs no-matches.
- Full anon-read verification requires separate anon-key client session (SQL Editor always runs as service_role).
- Sort from `sort_json` not yet wired to DynamicListPage (default sort used).
