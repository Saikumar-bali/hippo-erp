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
| 2.6 | Metadata Workspace, Navigation, and Compact ERP UI | Complete | Migration 0021, grouped workspace sidebar, DynamicRouteRenderer, compact density, pagination, no duplicate Status column. |
| 3 | Warehouse hierarchy | On Hold | Do not start until Phase 2.6 is verified. |
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
- `src/styles.css` — compact enterprise UI tokens (13px font, 32px rows, 42px topbar, 30px controls), workspace sidebar styles, pagination styles
- `src/components/metadata/DynamicListPage.tsx` — removed duplicate Status column, added pagination (20/page)
- `scripts/run-simulation.cjs` — added workspace navigation simulation
- `docs/METADATA_ENGINE.md` — added Phase 2.6 section

### Verification Results (2026-05-30)
| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 24 warnings (pre-existing) |
| `npm run test` | 31 pass, 6 fail (pre-existing failures in users-roles.spec.tsx, permission-gates.spec.tsx, app.spec.tsx, auth-routes.spec.tsx, dashboard-kpi.spec.tsx, auth-state.spec.tsx) |
| `npm run build` | Success |

### Remaining Gaps
- Generic document write API not implemented (intentional).
- Warehouse CRUD not started (Phase 3).
- Workflow transition engine not implemented.
- Naming series generation engine not implemented.
- Audit trail engine not implemented.
- User-created DocType builder UI not implemented.
- DynamicListPage needs better empty state design for no-data vs no-matches.
- `MetadataPrototype` still accessible in dev mode but hidden in production.
