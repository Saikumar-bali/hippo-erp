# Phase 2.6 Tasks: Metadata Workspace, Navigation, and Compact ERP UI

Active branch: `phase-2.5-metadata-engine`

Goal: convert the app shell, sidebar, Product Master grouping, and compact enterprise UI into a Frappe-inspired metadata-driven workspace/navigation layer.

Phase 2.5 proved metadata-driven Product Master rendering. Phase 2.6 must remove the remaining hardcoded navigation shape and make Product Master behave like a professional ERP workspace.

## Senior Architecture Rule

Do not jump to Warehouse implementation yet. First make the workspace/navigation engine metadata-driven. Warehouse should later be added by metadata, not by another hardcoded `App.tsx` branch.

## Frappe-Inspired Target

Frappe treats DocType metadata as the model/view description for data, and Workspaces as the Desk navigation/landing layer. Hippo ERP should mirror the architecture pattern without copying Frappe code or installing Frappe.

Target structure:

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

## Current Problems To Fix

- `src/lib/erp-modules.ts` still hardcodes the sidebar.
- `src/App.tsx` still hardcodes Product/Product Category/UOM component branches.
- Product Master appears as separate top-level entries instead of a grouped workspace.
- `Metadata Prototype` appears as a normal sidebar item.
- UI feels too large, like browser zoom is around 150%.
- Table has duplicate `STATUS` columns.
- List page lacks compact enterprise toolbar/pagination/density.

---

# A. Planning And Docs

Files:

- [x] `docs/PHASE_2_6_WORKSPACE_NAVIGATION.md`
- [x] `docs/METADATA_ENGINE.md`
- [x] `flow.md`
- [x] `progress.md`
- [x] `tasks.md`

Tasks:

- [x] Add a dedicated Phase 2.6 architecture doc.
- [x] Update `docs/METADATA_ENGINE.md` to mention workspace/navigation metadata as the next layer after DocType metadata.
- [x] Update `flow.md` to show Company → Workspace → DocType → Dynamic Renderer.
- [x] Update `progress.md` after implementation with exact verification results.

---

# B. Database: Workspace Navigation Metadata

Create migration:

- [x] `supabase/migrations/0021_workspace_navigation_core.sql`

Tables:

- [x] `app.erp_workspaces`
- [x] `app.erp_workspace_items`
- [x] `0022_workspace_schema_refine.sql` (explicit `target_doctype_key`, `target_workspace_key`, `route` columns + CHECK constraint)

Required table behavior:

- [x] RLS enabled.
- [x] Authenticated users can read active workspace metadata.
- [x] Anonymous users cannot read workspace metadata.
- [x] Frontend users cannot insert/update/delete workspace metadata.
- [x] Metadata writes remain migration/server-managed for this phase.
- [x] `app.erp_workspace_items` has unique `(workspace_key, item_key)`.
- [x] `workspace_item_target_check` ensures at least one target variant is set.

Seed:

- [x] Product Master workspace.
- [x] Product item → DocType `product`.
- [x] Product Categories item → DocType `product_category`.
- [x] Units of Measure item → DocType `unit_of_measure`.
- [x] Optional inactive placeholders for Warehouse, Inventory, Purchasing, Reports.

---

# C. Frontend Metadata Workspace Loader

Add files:

- [x] `src/lib/metadata/workspace-types.ts`
- [x] `src/lib/metadata/workspace-api.ts`
- [x] `src/hooks/useWorkspaceNavigation.ts`

Tasks:

- [x] Load workspaces from `app.erp_workspaces` using `supabase.schema("app")`.
- [x] Load workspace items from `app.erp_workspace_items`.
- [x] Filter inactive items.
- [x] Filter by `required_permission_key` using existing permission checker.
- [x] Support item types: `doctype`, `workspace`, `page`, `report`, `external`.
- [x] Return a typed navigation tree.
- [x] Provide fallback to `ERP_MODULES` only if metadata fails to load.
- [x] No service-role usage.

---

# D. App Shell And Sidebar Refactor

Add or update files:

- [x] `src/components/layout/AppShell.tsx`
- [x] `src/components/layout/WorkspaceSidebar.tsx`
- [x] `src/components/layout/WorkspaceGroup.tsx`
- [x] `src/components/layout/WorkspaceItem.tsx`
- [x] `src/components/layout/TopBar.tsx`
- [ ] `src/components/layout/Breadcrumbs.tsx` (deferred — not needed for current scope)

Tasks:

- [x] Replace flat sidebar with grouped workspace sidebar.
- [x] Product Master should expand/collapse and show Products, Product Categories, UOM.
- [x] Pending workspaces should appear disabled or hidden based on metadata.
- [x] Show active item clearly.
- [x] Keep company selector, user email, and logout in compact topbar.
- [x] Keep permission gating.
- [x] Hide `Metadata Prototype` unless `import.meta.env.DEV` or an explicit debug flag is true.

---

# E. Dynamic Route Renderer

Add file:

- [x] `src/components/metadata/DynamicRouteRenderer.tsx`

Tasks:

- [x] Replace `App.tsx` label-based Product/Product Category/UOM branches.
- [x] If selected item is `doctype`, render `DynamicListPage` with `target_doctype_key`.
- [x] If selected item is `workspace`, render `DynamicWorkspacePage`.
- [x] If selected item is unsupported, render compact placeholder.
- [x] Keep Company Profile and Users/Roles working safely if they are not converted in this phase.
- [x] Keep existing Product Master writes routed through existing safe RPC APIs.
- [x] **Review fix:** permissions resolved per-doctype via `config.actions` instead of hardcoded `update_product`/`delete_product`.

Acceptance for this section:

- [x] `App.tsx` no longer contains hardcoded branches for `Products`, `Product categories`, and `Units of measure`.

---

# F. Compact Enterprise UI Density

Update existing global CSS and component classes.

Target density:

- [x] Body font around `13px` (actual: `--font-size-md: 12px`).
- [x] Sidebar item font around `12px` (actual: `--font-size-sm: 11px`).
- [x] Table cell font around `12px` (actual: `--font-size-sm: 11px`).
- [x] Table row height around `32px` (actual: `--table-row-height: 28px` — slightly denser).
- [x] Topbar height around `42px` (actual: `--topbar-height: 36px` — denser).
- [x] Buttons around `30px` high (actual: `--control-height: 26px` — denser).
- [x] Inputs around `30px` high.
- [x] Reduce card padding (actual: `--card-padding: 8px`).
- [x] Reduce content padding (actual: `--content-padding: 8px`).
- [x] Add sticky table headers.
- [x] Add compact badges.
- [x] App should not feel like 150% zoom.

Actual tokens deployed:

```css
:root {
  --font-size-xs: 10px;
  --font-size-sm: 11px;
  --font-size-md: 12px;
  --font-size-lg: 14px;
  --sidebar-width: 200px;
  --topbar-height: 36px;
  --table-row-height: 28px;
  --content-padding: 8px;
  --card-padding: 8px;
  --control-height: 26px;
  --border-radius-sm: 4px;
}
```

---

# G. Dynamic List Improvements

Update:

- [x] `src/components/metadata/DynamicListPage.tsx`
- [ ] `src/components/metadata/DynamicFieldRenderer.tsx` (no additional changes needed)
- [x] `src/components/metadata/LinkField.tsx`
- [x] `src/components/metadata/DynamicActionBar.tsx`

Tasks:

- [x] Remove duplicate hardcoded Status column if metadata list already includes `is_active`.
- [x] Add compact toolbar: search, filters, refresh, create, export placeholder.
- [x] Add pagination (20/page).
- [ ] Add sort behavior from `sort_json` (deferred — default sort used).
- [x] Add compact loading/empty/error states.
- [x] Make clickable document column generic from metadata or priority fields.
- [x] Support Link metadata with `display_fields` and `display_template`.
- [x] Preserve fallback support for old `display_field`.

Example Link options:

```json
{
  "link_to": "product_category",
  "display_fields": ["code", "name"],
  "display_template": "{code} - {name}"
}
```

---

# H. Simulation Test

Add:

- [x] `tests/simulations/workspace_navigation_flow.sql`

Update:

- [x] `scripts/run-simulation.cjs`

Simulation must verify:

- [x] `app.erp_workspaces` exists.
- [x] `app.erp_workspace_items` exists.
- [x] Product Master workspace exists.
- [x] Product Master has three child items.
- [x] Each item points to correct DocType.
- [x] RLS is enabled on workspace tables.
- [x] Anonymous users cannot read workspace metadata (structural check).
- [x] Authenticated users can read active workspace metadata (structural check).
- [x] Normal authenticated users cannot insert/update/delete workspace metadata (BEGIN/EXCEPTION blocked-write check).
- [x] Explicit `target_doctype_key`, `target_workspace_key`, `route` columns verified.
- [x] `workspace_item_target_check` CHECK constraint verified.
- [x] Anonymous-read limitation documented (full anon simulation requires separate client session).

---

# I. Verification Commands

Run and document exact output in `progress.md`:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Manual UI verification:

- [x] Product Master appears as one grouped workspace.
- [x] Products, Product Categories, and Units of Measure appear as child items.
- [x] Clicking Products opens metadata-driven Product list.
- [x] Clicking Product Categories opens metadata-driven Category list.
- [x] Clicking Units of Measure opens metadata-driven UOM list.
- [x] Metadata Prototype is hidden in production mode.
- [x] UI density is compact and no longer oversized.
- [x] Duplicate Status column is gone.
- [x] Permission-gated actions still work.

---

# J. Out Of Scope

Do not implement these in Phase 2.6:

- Generic document write API.
- Warehouse CRUD implementation.
- GRN or Stock Ledger.
- Workflow transition engine.
- Naming series generation engine.
- User-created DocType builder UI.
- Breadcrumbs component (deferred).

---

# K. Acceptance Criteria

Phase 2.6 is complete only when:

- [x] Workspace metadata tables exist and pass simulation.
- [x] Sidebar/workspace navigation is metadata-driven.
- [x] Product Master is grouped with Product/Category/UOM child items.
- [x] `App.tsx` no longer hardcodes Product/Product Category/UOM rendering branches.
- [x] Product Master screens still use `DynamicListPage` and existing safe RPC writes.
- [x] UI is compact, enterprise-level, and no longer visually oversized.
- [x] Verification commands are documented.
- [x] Any test failures are marked as pre-existing or newly introduced.
- [x] DynamicRouteRenderer uses per-doctype permissions from `config.actions` (review fix #1).
- [x] Workspace schema has explicit `target_doctype_key`/`target_workspace_key`/`route` columns (review fix #2).
- [x] Simulation has real blocked-write checks with BEGIN/EXCEPTION (review fix #3).
- [x] Anonymous-read limitation documented (review fix #4).
- [x] `tasks.md` and `progress.md` are in sync (review fix #5).

---

# L. CLI-AI Required Final Report

CLI-AI must report and commit the following into `progress.md`:

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
