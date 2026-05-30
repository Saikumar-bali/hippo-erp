# Phase 2.6: Metadata Workspace, Navigation, and Compact ERP UI

## Purpose

Phase 2.5 proved that Product Master can render from metadata. Phase 2.6 moves Hippo ERP closer to a Frappe-style Desk by making navigation, workspaces, menus, and page shell metadata-driven.

This phase must not implement Warehouse business logic yet. It prepares the platform so Warehouse can later be added as metadata instead of another hardcoded sidebar branch.

## Frappe-Inspired Principles

Frappe concepts to mirror architecturally, without copying Frappe source code:

- A DocType describes both the model and view behavior of business data.
- Metadata can produce list and form views without hand-writing each screen.
- Workspaces are the landing/navigation layer for modules.
- Workspaces can contain links, shortcuts, cards/blocks, and nested/child workspaces.
- Visibility depends on role permissions.
- Enterprise UI should be compact, dense, fast, keyboard-friendly, and not look zoomed in.

## Current Problem

The UI is only partially metadata-driven:

- `src/lib/erp-modules.ts` still hardcodes sidebar modules.
- `src/App.tsx` still hardcodes module-to-component branching.
- Product, Product Category, and UOM appear as separate top-level sidebar items instead of a grouped Product Master workspace.
- `Metadata Prototype` is still visible as a production-like sidebar item.
- List UI is too large/dense visually in the wrong way: oversized shell, duplicated status column, large padding, and too much whitespace.

## Target UX

Sidebar should become workspace-based:

```text
Product Master
  Products
  Product Categories
  Units of Measure

Warehouse
  Warehouses
  Zones
  Aisles
  Racks
  Shelves
  Bins

Inventory
  Current Stock
  Batches
  Movements Ledger
  Reservations
  Reorder Alerts
```

Product Master page should look like a compact enterprise ERP page:

```text
Breadcrumb: Product Master / Products
Title: Products
Toolbar: Search | Filters | Refresh | Export | New Product
Density: compact
Table: 13px text, 32px row height, sticky header, pagination
```

## New Metadata Tables

Create a migration, suggested name:

`supabase/migrations/0021_workspace_navigation_core.sql`

### `app.erp_workspaces`

Purpose: high-level ERP workspace/module grouping.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `workspace_key text unique not null`
- `label text not null`
- `description text`
- `icon text`
- `parent_workspace_key text references app.erp_workspaces(workspace_key)`
- `route text`
- `sort_order int not null default 0`
- `is_public boolean not null default true`
- `is_active boolean not null default true`
- `required_permission_key text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `app.erp_workspace_items`

Purpose: links/cards/menu items inside a workspace.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `workspace_key text not null references app.erp_workspaces(workspace_key)`
- `item_key text not null`
- `label text not null`
- `description text`
- `icon text`
- `item_type text not null` — allowed values: `doctype`, `report`, `page`, `workspace`, `external`
- `target_doctype_key text references app.erp_doctypes(doctype_key)`
- `target_workspace_key text references app.erp_workspaces(workspace_key)`
- `route text`
- `required_permission_key text`
- `sort_order int not null default 0`
- `is_active boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- unique: `(workspace_key, item_key)`

## Seed Product Master Workspace

Seed:

- Workspace: `product_master`
  - Product
  - Product Category
  - Unit of Measure

Rules:

- Product Master visible when user has `view_products`.
- Products item targets DocType `product`.
- Product Categories item targets DocType `product_category`.
- Units of Measure item targets DocType `unit_of_measure`.

Seed future inactive placeholders only if useful:

- `warehouse`
- `inventory`
- `purchasing`
- `reports`

Do not make pending modules clickable unless they have working screens.

## Frontend Files To Add

Suggested files:

- `src/lib/metadata/workspace-api.ts`
- `src/lib/metadata/workspace-types.ts`
- `src/hooks/useWorkspaceNavigation.ts`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/WorkspaceSidebar.tsx`
- `src/components/layout/WorkspaceGroup.tsx`
- `src/components/layout/WorkspaceItem.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/layout/Breadcrumbs.tsx`
- `src/components/metadata/DynamicRouteRenderer.tsx`
- `src/components/metadata/DynamicWorkspacePage.tsx`

## Frontend Refactor Rules

1. Keep `ERP_MODULES` only as a fallback while metadata loads.
2. Sidebar should prefer `app.erp_workspaces` + `app.erp_workspace_items`.
3. `App.tsx` should stop hardcoding Product/Product Category/UOM branches.
4. `DynamicRouteRenderer` should route metadata items:
   - `item_type = doctype` → `DynamicListPage doctypeKey={target_doctype_key}`
   - `item_type = workspace` → `DynamicWorkspacePage workspaceKey={target_workspace_key}`
   - unsupported type → friendly placeholder
5. `Metadata Prototype` should be hidden unless `import.meta.env.DEV` or explicit admin/debug flag is enabled.
6. Existing permissions must still gate navigation and actions.
7. No service-role key in frontend.

## Compact Enterprise UI Requirements

The app currently feels too zoomed. Do not fix this by browser zoom. Fix app density.

Create or update CSS design tokens, preferably in existing global CSS:

```css
:root {
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-md: 13px;
  --font-size-lg: 15px;
  --sidebar-width: 220px;
  --topbar-height: 42px;
  --table-row-height: 32px;
  --content-padding: 12px;
  --card-padding: 12px;
  --control-height: 30px;
  --border-radius-sm: 6px;
}
```

UI density targets:

- Body font: 13px.
- Sidebar item font: 12px.
- Table cell font: 12px.
- Table row height: 32px.
- Topbar height: 42px.
- Buttons height: 30px.
- Inputs height: 30px.
- Remove oversized cards and whitespace.
- Use sticky table header.
- Add pagination footer.
- Add compact badges.
- Remove duplicated `STATUS` column in list view.

## Dynamic List Improvements

Update `DynamicListPage`:

- Remove hardcoded extra Status column if metadata already includes `is_active`.
- Add compact toolbar:
  - Search
  - Filters
  - Refresh
  - New document action
  - Export placeholder if permission exists
- Add pagination.
- Add sort from `sort_json`.
- Add empty/loading/error compact states.
- Add column renderer that supports combined display fields for Link metadata.
- Add density class: `erp-density-compact`.

## Link Display Improvement

Allow field metadata like:

```json
{
  "link_to": "product_category",
  "display_fields": ["code", "name"],
  "display_template": "{code} - {name}"
}
```

Fallback to current `display_field` if `display_fields` is absent.

## Security Requirements

- Workspace metadata is readable by authenticated users.
- Workspace metadata writes are blocked from frontend in this phase.
- Workspace visibility must respect `required_permission_key`.
- DocType item visibility must also respect `app.erp_doctype_actions.read`.
- Do not trust frontend-selected company/tenant blindly for writes.
- Keep all Product Master writes on existing safe RPC functions.

## Simulation Test

Add:

`tests/simulations/workspace_navigation_flow.sql`

Must verify:

- `app.erp_workspaces` exists.
- `app.erp_workspace_items` exists.
- Product Master workspace exists.
- Product Master has three items.
- Each item points to correct DocType.
- RLS is enabled.
- Anonymous users cannot read workspace metadata.
- Authenticated users can read active workspace metadata.
- Normal authenticated users cannot insert/update/delete workspace metadata.

Update:

- `scripts/run-simulation.cjs` to include workspace navigation simulation.

## Build Verification

Run and document:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Manual UI verification:

- Product Master appears as one grouped workspace.
- Products, Product Categories, and Units of Measure appear as submenu/items.
- Clicking Product opens metadata-driven Product list.
- Clicking Categories opens metadata-driven Category list.
- Clicking UOM opens metadata-driven UOM list.
- Metadata Prototype is hidden in production mode.
- UI density is compact and no longer looks 150% zoomed.
- Duplicate Status column is gone.
- Product Master actions still respect permissions.

## Out Of Scope

- Generic document write API.
- Warehouse CRUD implementation.
- GRN/Stock ledger posting.
- Workflow transition engine.
- Naming series generation engine.
- User-created DocType builder UI.

## Acceptance Criteria

Phase 2.6 is complete only when:

- Workspace metadata tables exist and pass simulation.
- Sidebar/workspace navigation is metadata-driven.
- Product Master is grouped with Product/Category/UOM child items.
- `App.tsx` no longer hardcodes Product/Product Category/UOM rendering branches.
- Product Master screens still use `DynamicListPage` and existing safe RPC writes.
- UI is compact, enterprise-level, and no longer visually oversized.
- `npm run typecheck`, `lint`, `test`, `build`, and `test:simulation` results are documented.
- Any test failures are clearly marked as pre-existing or newly introduced.

## CLI-AI Required Final Report

After implementation, CLI-AI must produce this final report in the chat and commit it into `progress.md`:

1. Files inspected.
2. Files changed.
3. Migration added.
4. Workspace metadata seeded.
5. Frontend navigation changes.
6. UI density changes.
7. Simulation results.
8. Typecheck/lint/test/build results.
9. Remaining gaps.
10. Commit hash pushed to `phase-2.5-metadata-engine`.
