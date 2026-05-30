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
- [ ] `docs/METADATA_ENGINE.md`
- [ ] `flow.md`
- [ ] `progress.md`
- [ ] `tasks.md`

Tasks:

- [x] Add a dedicated Phase 2.6 architecture doc.
- [ ] Update `docs/METADATA_ENGINE.md` to mention workspace/navigation metadata as the next layer after DocType metadata.
- [ ] Update `flow.md` to show Company → Workspace → DocType → Dynamic Renderer.
- [ ] Update `progress.md` after implementation with exact verification results.

---

# B. Database: Workspace Navigation Metadata

Create migration:

- [ ] `supabase/migrations/0021_workspace_navigation_core.sql`

Tables:

- [ ] `app.erp_workspaces`
- [ ] `app.erp_workspace_items`

Required table behavior:

- [ ] RLS enabled.
- [ ] Authenticated users can read active workspace metadata.
- [ ] Anonymous users cannot read workspace metadata.
- [ ] Frontend users cannot insert/update/delete workspace metadata.
- [ ] Metadata writes remain migration/server-managed for this phase.
- [ ] `app.erp_workspace_items` has unique `(workspace_key, item_key)`.

Seed:

- [ ] Product Master workspace.
- [ ] Product item → DocType `product`.
- [ ] Product Categories item → DocType `product_category`.
- [ ] Units of Measure item → DocType `unit_of_measure`.
- [ ] Optional inactive placeholders for Warehouse, Inventory, Purchasing, Reports.

---

# C. Frontend Metadata Workspace Loader

Add files:

- [ ] `src/lib/metadata/workspace-types.ts`
- [ ] `src/lib/metadata/workspace-api.ts`
- [ ] `src/hooks/useWorkspaceNavigation.ts`

Tasks:

- [ ] Load workspaces from `app.erp_workspaces` using `supabase.schema("app")`.
- [ ] Load workspace items from `app.erp_workspace_items`.
- [ ] Filter inactive items.
- [ ] Filter by `required_permission_key` using existing permission checker.
- [ ] Support item types: `doctype`, `workspace`, `page`, `report`, `external`.
- [ ] Return a typed navigation tree.
- [ ] Provide fallback to `ERP_MODULES` only if metadata fails to load.
- [ ] No service-role usage.

---

# D. App Shell And Sidebar Refactor

Add or update files:

- [ ] `src/components/layout/AppShell.tsx`
- [ ] `src/components/layout/WorkspaceSidebar.tsx`
- [ ] `src/components/layout/WorkspaceGroup.tsx`
- [ ] `src/components/layout/WorkspaceItem.tsx`
- [ ] `src/components/layout/TopBar.tsx`
- [ ] `src/components/layout/Breadcrumbs.tsx`

Tasks:

- [ ] Replace flat sidebar with grouped workspace sidebar.
- [ ] Product Master should expand/collapse and show Products, Product Categories, UOM.
- [ ] Pending workspaces should appear disabled or hidden based on metadata.
- [ ] Show active item clearly.
- [ ] Keep company selector, user email, and logout in compact topbar.
- [ ] Keep permission gating.
- [ ] Hide `Metadata Prototype` unless `import.meta.env.DEV` or an explicit debug flag is true.

---

# E. Dynamic Route Renderer

Add file:

- [ ] `src/components/metadata/DynamicRouteRenderer.tsx`

Tasks:

- [ ] Replace `App.tsx` label-based Product/Product Category/UOM branches.
- [ ] If selected item is `doctype`, render `DynamicListPage` with `target_doctype_key`.
- [ ] If selected item is `workspace`, render `DynamicWorkspacePage`.
- [ ] If selected item is unsupported, render compact placeholder.
- [ ] Keep Company Profile and Users/Roles working safely if they are not converted in this phase.
- [ ] Keep existing Product Master writes routed through existing safe RPC APIs.

Acceptance for this section:

- [ ] `App.tsx` no longer contains hardcoded branches for `Products`, `Product categories`, and `Units of measure`.

---

# F. Compact Enterprise UI Density

Update existing global CSS and component classes.

Target density:

- [ ] Body font around `13px`.
- [ ] Sidebar item font around `12px`.
- [ ] Table cell font around `12px`.
- [ ] Table row height around `32px`.
- [ ] Topbar height around `42px`.
- [ ] Buttons around `30px` high.
- [ ] Inputs around `30px` high.
- [ ] Reduce card padding.
- [ ] Reduce content padding.
- [ ] Add sticky table headers.
- [ ] Add compact badges.
- [ ] App should not feel like 150% zoom.

Suggested tokens:

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

---

# G. Dynamic List Improvements

Update:

- [ ] `src/components/metadata/DynamicListPage.tsx`
- [ ] `src/components/metadata/DynamicFieldRenderer.tsx`
- [ ] `src/components/metadata/LinkField.tsx`
- [ ] `src/components/metadata/DynamicActionBar.tsx`

Tasks:

- [ ] Remove duplicate hardcoded Status column if metadata list already includes `is_active`.
- [ ] Add compact toolbar: search, filters, refresh, create, export placeholder.
- [ ] Add pagination.
- [ ] Add sort behavior from `sort_json`.
- [ ] Add compact loading/empty/error states.
- [ ] Make clickable document column generic from metadata or priority fields.
- [ ] Support Link metadata with `display_fields` and `display_template`.
- [ ] Preserve fallback support for old `display_field`.

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

- [ ] `tests/simulations/workspace_navigation_flow.sql`

Update:

- [ ] `scripts/run-simulation.cjs`

Simulation must verify:

- [ ] `app.erp_workspaces` exists.
- [ ] `app.erp_workspace_items` exists.
- [ ] Product Master workspace exists.
- [ ] Product Master has three child items.
- [ ] Each item points to correct DocType.
- [ ] RLS is enabled on workspace tables.
- [ ] Anonymous users cannot read workspace metadata.
- [ ] Authenticated users can read active workspace metadata.
- [ ] Normal authenticated users cannot insert/update/delete workspace metadata.

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

- [ ] Product Master appears as one grouped workspace.
- [ ] Products, Product Categories, and Units of Measure appear as child items.
- [ ] Clicking Products opens metadata-driven Product list.
- [ ] Clicking Product Categories opens metadata-driven Category list.
- [ ] Clicking Units of Measure opens metadata-driven UOM list.
- [ ] Metadata Prototype is hidden in production mode.
- [ ] UI density is compact and no longer oversized.
- [ ] Duplicate Status column is gone.
- [ ] Permission-gated actions still work.

---

# J. Out Of Scope

Do not implement these in Phase 2.6:

- Generic document write API.
- Warehouse CRUD implementation.
- GRN or Stock Ledger.
- Workflow transition engine.
- Naming series generation engine.
- User-created DocType builder UI.

---

# K. Acceptance Criteria

Phase 2.6 is complete only when:

- [ ] Workspace metadata tables exist and pass simulation.
- [ ] Sidebar/workspace navigation is metadata-driven.
- [ ] Product Master is grouped with Product/Category/UOM child items.
- [ ] `App.tsx` no longer hardcodes Product/Product Category/UOM rendering branches.
- [ ] Product Master screens still use `DynamicListPage` and existing safe RPC writes.
- [ ] UI is compact, enterprise-level, and no longer visually oversized.
- [ ] Verification commands are documented.
- [ ] Any test failures are marked as pre-existing or newly introduced.

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
