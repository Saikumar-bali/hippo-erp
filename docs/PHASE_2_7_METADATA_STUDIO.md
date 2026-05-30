# Phase 2.7: Metadata Studio / Developer Side

## Purpose

Phase 2.6 proved that ERP user screens can be driven by metadata — DocTypes, DocFields, List Views, Form Layouts, and Workspaces. A normal ERP user interacts with dynamic list/detail pages that read metadata and render appropriate UIs.

Phase 2.7 creates the **Developer Side** — a Metadata Studio workspace where authorized developers and platform admins can inspect, and eventually manage, the metadata that drives the entire ERP.

## Two-Sided Architecture

### ERP User Side (existing, Phase 2.5 + 2.6)

```
ERP User
  └── Workspace Sidebar (metadata-driven)
       ├── Product Master (active)
       │    ├── Products         → DynamicListPage(product)
       │    ├── Product Categories → DynamicListPage(product_category)
       │    └── Units of Measure → DynamicListPage(unit_of_measure)
       ├── Warehouse (inactive placeholder)
       ├── Inventory (inactive)
       ├── Purchasing (inactive)
       └── Reports (inactive)
```

- Users see only active workspaces they have permission for.
- Screens are rendered dynamically from DocType metadata.
- Users cannot see or modify metadata structure.

### Developer / Metadata Studio Side (new, Phase 2.7)

```
Developer / Platform Admin
  └── Workspace Sidebar
       ├── Metadata Studio (active, requires manage_metadata)
       │    ├── DocTypes        → Read-only list of all DocTypes
       │    ├── DocFields       → Read-only list of all DocFields
       │    ├── Workspaces      → Read-only list of workspace metadata
       │    ├── Workspace Items → Read-only list of workspace items
       │    ├── List Views      → Read-only list of list view configs
       │    ├── Form Layouts    → Read-only list of form layout configs
       │    ├── DocType Actions → Read-only list of action→permission maps
       │    ├── Naming Series   → Read-only list of naming series configs
       │    └── Workflows       → Read-only list of workflow configs
       ├── Product Master (still visible if user has both permissions)
       └── ...
```

- Only users with `manage_metadata` permission see this workspace.
- Initial UI is read-only (inspection only).
- Future phases will add safe edit/create flows.

## How DocType Metadata Drives ERP Screens

1. A **DocType** definition (`app.erp_doctypes`) declares a business entity (e.g. `product`).
2. **DocFields** (`app.erp_docfields`) define every field, its type, validation rules, and list/form visibility.
3. **List Views** (`app.erp_list_views`) define which columns appear in list tables, column widths, filters, and sort order.
4. **Form Layouts** (`app.erp_form_layouts`) define form sections and field grouping.
5. **DocType Actions** (`app.erp_doctype_actions`) map user-facing actions (read, create, update, deactivate) to permission keys.
6. **Workspaces + Workspace Items** (`app.erp_workspaces` / `app.erp_workspace_items`) define navigation layout.
7. **DynamicListPage** reads List View metadata and renders a table.
8. **DynamicFormPage** reads Form Layout metadata and renders an edit form.

## Why Normal Users Should Not Create Physical DB Tables

- Physical table creation requires `CREATE TABLE` privilege which is a security risk.
- Metadata tables (`app.erp_*`) must stay in sync with frontend rendering logic.
- Dynamic DocTypes (user-created) would require a separate storage mechanism (e.g. JSONB + generic schema), not raw PostgreSQL tables.
- RLS policies are table-specific — dynamic tables would bypass the existing permission model.
- Supabase Cloud migrations/seeds must be verified to ensure consistency between environments.

## Why Supabase Cloud Migrations/Seeds Must Be Verified

- The project uses Supabase Cloud as the primary database, not local Supabase.
- Migrations are applied via the Management API (`POST /v1/projects/{ref}/database/query`).
- Each migration must be idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).
- Simulations run after each migration to verify structural + behavioral correctness.
- Seeds (workspaces, permissions, demo data) must be verified via count queries.

## Phase 2.7 Scope

### In Scope
- Metadata Studio workspace with `manage_metadata` permission gate.
- Permission `manage_metadata` seeded and granted to owner/admin roles.
- Read-only metadata inspection pages (DocTypes, DocFields, Workspaces, Workspace Items, List Views, Form Layouts, DocType Actions, Naming Series, Workflows).
- New tables: `app.erp_audit_logs`, `app.erp_metadata_change_requests` (foundation for future safe-edits).
- Simulation that verifies the Metadata Studio foundation.
- All changes applied and verified on Supabase Cloud.

### Out of Scope (deferred to future phases)
- Warehouse CRUD implementation.
- GRN or Stock Ledger.
- Generic document write API.
- Physical table creation by users.
- User-created DocType storage (dynamic schema).
- Workflow transition engine.
- Naming series generation engine.
- Metadata Studio edit/create forms (read-only only).
- Breadcrumbs component.
