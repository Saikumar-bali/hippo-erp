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
| 2.5 | Metadata-Driven ERP Core | Complete as renderer prototype | Metadata tables, Product Master metadata seed, dynamic renderers, and Product Master metadata UI exist. This is not the final full Frappe-like engine. |
| 2.6 | Metadata Workspace, Navigation, and Compact ERP UI | Active | Build metadata-driven workspaces/sidebar/submenus, Product Master grouping, DynamicRouteRenderer, compact enterprise UI density, and workspace simulation tests. |
| 3 | Warehouse hierarchy | On Hold | Do not start until Phase 2.6 is verified. |
| 4+ | GRN, stock ledger, transactions, reports | Pending | Must use explicit safe business services for stock-changing actions. |

## Phase 2.5 Verified Foundation

- `app.erp_*` metadata tables exist from migration `0020_metadata_engine_core.sql`.
- Product Master metadata is seeded for `product_category`, `unit_of_measure`, and `product`.
- Metadata loader files exist under `src/lib/metadata/`.
- Dynamic renderer components exist under `src/components/metadata/`.
- Product Master screens now render through `DynamicListPage`.
- Generic document write APIs are intentionally not implemented yet.

## Current Architecture Gaps

- Sidebar navigation is still hardcoded in `src/lib/erp-modules.ts`.
- `src/App.tsx` still contains label-based conditional rendering.
- Product Master items are still separate top-level sidebar entries instead of child items inside one workspace.
- Data operations still use explicit `doctype-api-map.ts` registrations.
- Workflow transition engine is not implemented.
- Naming series generation engine is not implemented.
- Audit trail engine is not implemented.
- UI density is too large and must become compact for enterprise use.

## Active Work

Start Phase 2.6 using `tasks.md` and `docs/PHASE_2_6_WORKSPACE_NAVIGATION.md`.

Implementation order:

1. Add migration `0021_workspace_navigation_core.sql`.
2. Seed Product Master workspace and child items.
3. Add workspace metadata loader and hook.
4. Replace flat sidebar with metadata-driven workspace sidebar.
5. Add `DynamicRouteRenderer`.
6. Remove hardcoded Product/Product Category/UOM render branches from `App.tsx`.
7. Hide `Metadata Prototype` outside dev/debug mode.
8. Compact the enterprise UI density.
9. Add workspace navigation simulation test.
10. Run and document verification.

## Required Verification Commands For Phase 2.6

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

CLI-AI must update this file with exact results after implementation.

## Completion Principle

Each phase must be completed and verified before moving to the next phase. When `tasks.md` is complete, GPT-5.5 verifies the work and then prepares the next phase checklist.
