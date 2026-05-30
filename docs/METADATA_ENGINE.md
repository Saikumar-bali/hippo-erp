# Metadata-Driven ERP Engine

## Purpose

Hippo ERP is moving from hand-coded React/Supabase screens toward a Frappe-inspired metadata-driven architecture. This document explains the direction, constraints, and mapping between Frappe concepts and Hippo ERP implementations.

## Important Constraints

- **Frappe is inspiration only.** We do not run Frappe, install Frappe, or copy Frappe source code.
- **Supabase remains primary.** Supabase Auth, Postgres, RLS, and RPC are the core backend.
- **Node.js is optional.** A Node.js metadata/document service may be added later if orchestration needs exceed what RPC/Edge Functions can safely handle.
- **Metadata-driven does not mean unsafe writes.** Master data (products, categories, UOM) can use generic metadata CRUD through whitelisted paths. Stock-changing transactions (GRN posting, transfers, adjustments) require explicit controlled services.
- **No dynamic user-created DocTypes in this phase.** Metadata is seeded and managed through migrations. UI-driven DocType creation is a future concern.

## Concept Mapping

| Frappe Concept | Hippo ERP Concept |
|---|---|
| DocType | `app.erp_doctypes` — document/entity metadata definition |
| DocField | `app.erp_docfields` — field metadata with types, validation, display rules |
| DocPerm | `app.erp_doctype_actions` — action-to-permission mapping |
| Document | Row/business record in a company-scoped table |
| Naming Series | `app.erp_naming_series` — company-scoped document numbering |
| Workflow | `app.erp_workflows` + `app.erp_workflow_states` + `app.erp_workflow_transitions` |
| List View | `app.erp_list_views` — column config, filters, search, sort |
| Form Layout | `app.erp_form_layouts` — section-based form/detail layout |
| Server Script / Controller | Supabase RPC / Edge Function / (future) Node service |
| Role Permission Manager | `app.company_role_permissions` + `app.company_role_assignments` |
| Module | `app.erp_modules` — high-level application module |

## Runtime Architecture

```
Frontend (React)
  |
  |-- DynamicListPage     (loads list metadata + fields + permissions)
  |-- DynamicFormPage     (loads form layout + fields + validation)
  |-- DynamicDetailPage   (loads form layout with read-only data)
  |-- DynamicFieldRenderer (renders typed fields from metadata)
  |-- DynamicFilterBar    (renders standard filters from metadata)
  |-- DynamicActionBar    (renders permission-aware actions)
  |
  |-- Metadata Loader     (fetches from Supabase or metadata API)
  |-- DocType Registry    (cached DocType metadata for current session)
  |
  v
Supabase / (future Node Metadata API)
  |
  |-- app.erp_* tables    (metadata configuration)
  |-- wh.* tables          (business data)
  |-- app.* tables         (company/role/permission data)
  |-- SECURITY DEFINER RPC (permission-aware write operations)
  |-- RLS policies         (row-level security)
```

## Security Rules

1. **Metadata reads**: Any authenticated user with company membership can read metadata config.
2. **Metadata writes**: Restricted to platform owners/admins (migration-only in current phase).
3. **Data reads**: Company-scoped, permission-checked via RPC or RLS.
4. **Master data writes**: Whitelisted DocTypes, whitelisted fields, permission-checked.
5. **Stock-changing writes**: Explicit controlled RPC/services only — never generic CRUD.
6. **No service role in frontend.**
7. **No raw table/column writes from arbitrary metadata without whitelist validation.**

## Current Phase Scope

Phase 2.5 seeds metadata for the existing Product Master (products, categories, UOM) and provides dynamic renderer prototypes that run alongside the existing hand-coded screens. This proves the metadata engine works before migrating existing or building new modules.

## Phase 3: Warehouse Hierarchy (Design)

### Warehouse Entity Model

The warehouse hierarchy follows a strict 6-level tree:

```
Warehouse → Zone → Aisle → Rack → Shelf → Bin
```

Each level is company-scoped (`tenant_id`), has a unique code within its parent, and supports `is_active` deactivation. Only `warehouses` has `created_by`/`updated_by` audit columns (child tables lack them — may need migration to add).

### Permissions

| Permission Key | warehouse_manager | stock_operator | viewer |
|---|---|---|---|
| `view_warehouses` | ✓ | ✓ | ✓ |
| `create_warehouse` | ✓ | | |
| `update_warehouse` | ✓ | | |
| `delete_warehouse` | | | |
| `manage_bins` | ✓ | | |

Frontend modules: `"Warehouse hierarchy builder"` (for warehouse/zone/aisle/rack/shelf/bin CRUD), `"Bin management"` (for bin-specific operations).

### DocTypes to Seed

Six DocTypes in `app.erp_doctypes`:
- `warehouse` → `wh.warehouses`
- `warehouse_zone` → `wh.warehouse_zones`
- `warehouse_aisle` → `wh.warehouse_aisles`
- `warehouse_rack` → `wh.warehouse_racks`
- `warehouse_shelf` → `wh.warehouse_shelves`
- `warehouse_bin` → `wh.warehouse_bins`

Each with DocFields, Actions (mapped to permission keys), List Views, and Form Layouts.

### Backend Requirements (before metadata activation)

1. **Enable warehouse module**: Set `app.erp_modules.is_active = true` for module_key `'warehouse'`.
2. **Create CRUD RPCs**: Following the product master pattern (migrations 0015-0019), create `wh.*` + `public.*` functions for each warehouse entity:
   - `wh.get_warehouses()`, `wh.create_warehouse()`, `wh.update_warehouse()`, `wh.deactivate_warehouse()` (+ reactivate)
   - Same pattern for zones, aisles, racks, shelves, bins
3. **Add audit columns** (optional): Add `created_by`/`updated_by` to child hierarchy tables for consistency.
4. **Update doctype-api-map**: Register warehouse DocType APIs in the frontend bridge.

## Phase 2.6: Workspace Navigation Layer

### New Metadata Tables

- `app.erp_workspaces` — workspace groups (e.g., "Product Master", "Warehouse")
- `app.erp_workspace_items` — items within workspaces (doctype, page, report, external links)

### Frontend Components

- `WorkspaceSidebar` — replaces hardcoded flat sidebar with grouped workspace navigation
- `WorkspaceGroup` — expandable/collapsible workspace group
- `WorkspaceItem` — clickable navigation item
- `DynamicRouteRenderer` — replaces `App.tsx` hardcoded label-based conditional rendering
- `AppShell` — layout wrapper that composes sidebar + topbar + content

### Flow

```
App.tsx
  → useWorkspaceNavigation() fetches app.erp_workspaces + app.erp_workspace_items
  → WorkspaceSidebar renders grouped navigation
  → User clicks item → DynamicRouteRenderer renders appropriate view:
      - doctype → DynamicListPage
      - page   → hardcoded component (CompanyProfile, UsersRoles, MetadataPrototype, ModuleView)
      - report → ModuleView
```

### Fallback

If workspace metadata fails to load or is empty, the hook falls back to `ERP_MODULES` from `erp-modules.ts` grouped into Product Master / Administration / Other.

### Production Mode

`MetadataPrototype` is hidden unless `import.meta.env.DEV` is true.

### Hierarchy UI Consideration

The 6-level tree hierarchy benefits from a dedicated tree-builder component rather than 6 separate list/detail pages. Design options:
- **Option A**: Single tree component that loads all levels and allows inline CRUD (better UX, more complex).
- **Option B**: Six separate DynamicListPage instances with parent-as-filter (simpler, consistent with Product Master pattern).
- **Recommendation**: Start with Option B using metadata-driven DynamicListPage, add tree component later if hierarchy navigation proves painful.
