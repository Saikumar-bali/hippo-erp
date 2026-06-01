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

## Phase 2.9: Custom DocType Wizard

### Purpose

The Custom DocType Wizard provides a guided 7-step flow for creating working `generic_json` DocTypes from the Metadata Studio UI, eliminating the need to manually insert rows into 6 separate metadata tables.

### Architecture

```
Metadata Studio Home
  │
  ├─ "Create Custom DocType"  (primary action)
  │     │
  │     └─ CustomDocTypeWizard
  │           │
  │           ├─ Step 1: Basic Info        →  erp_doctypes row
  │           ├─ Step 2: Fields            →  erp_docfields rows
  │           ├─ Step 3: List View         →  erp_list_views row
  │           ├─ Step 4: Form Layout       →  erp_form_layouts row
  │           ├─ Step 5: Actions           →  erp_doctype_actions rows
  │           ├─ Step 6: Workspace         →  erp_workspace_items row
  │           └─ Step 7: Preview & Create  →  createCustomDocTypeBundle()
  │
  └─ "Advanced Metadata Tables"  (secondary)
        └─ Raw metadata inspection pages
```

### Bundle Insert Pattern

The `createCustomDocTypeBundle()` function in `metadata-studio-api.ts` inserts all 6 metadata sets in dependency order:

1. `erp_doctypes` — DocType definition
2. `erp_docfields` — Field definitions (FK to doctype_key)
3. `erp_list_views` — List view config (FK to doctype_key)
4. `erp_form_layouts` — Form layout config (FK to doctype_key)
5. `erp_doctype_actions` — Action-to-permission mappings (FK to doctype_key)
6. `erp_workspace_items` — Sidebar navigation entry (FK to workspace_key)

Each insert is sequential to respect FK constraints. If any insert fails, the error propagates and earlier inserts remain (manual cleanup or future RPC transaction).

### Wizard Steps vs Metadata

| Step | Metadata Created | Auto-generated |
|------|-----------------|----------------|
| Basic Info | `erp_doctypes` | doctype_key (snake_case from label), route |
| Fields | `erp_docfields` (multiple rows) | fieldname (snake_case from label), sort_order |
| List View | `erp_list_views` | columns from in_list_view fields, search from Data fields, sort from first column |
| Form Layout | `erp_form_layouts` | Basic Info section with all fields |
| Actions | `erp_doctype_actions` (4 rows) | action keys: read, create, update, deactivate |
| Workspace | `erp_workspace_items` | target = doctype_key, permission = read action key |
| Preview & Create | All inserts via bundle API | Summary table before confirmation |

### Constraints

- `storage_strategy` must be `generic_json` for custom DocTypes
- `physical_rpc` is disabled in the wizard (migration-only)
- All keys must be lowercase snake_case
- At least one Data or Text field required (serves as name/title)
- At least one field must be in list view
- No duplicate fieldnames within a DocType

## Phase 2.10: Custom DocType Wizard Hardening

### Purpose

Phase 2.10 hardens the Phase 2.9 wizard by adding:
- Transaction-safe atomic bundle creation via `erp_create_custom_doctype_bundle` RPC
- Duplicate key detection (doctype_key, workspace item_key)
- Permission auto-provisioning (catalog keys + owner/admin role grants)
- Sidebar refresh without page reload
- Real UI verification flow

### Architecture Changes

```
Before (Phase 2.9):
createCustomDocTypeBundle()
  └─ 6 sequential Supabase inserts (no transaction)

After (Phase 2.10):
createCustomDocTypeBundle()
  └─ supabase.rpc("erp_create_custom_doctype_bundle", { ... })
       └─ Single PostgreSQL transaction:
            ├─ Duplicate checks (doctype_key, item_key)
            ├─ Insert DocType
            ├─ Insert DocFields
            ├─ Insert List View
            ├─ Insert Form Layout
            ├─ Insert DocType Actions
            ├─ Provision permission keys in app.permissions (if new)
            ├─ Insert Workspace Item
            └─ Grant permissions to owner/admin roles
```

### Bundle RPC: `erp_create_custom_doctype_bundle`

- Schema: `public`
- Security: `SECURITY DEFINER` (bypasses RLS for metadata table writes)
- Parameters: All 6 metadata sets + `p_company_id` for permission grants
- Returns: `jsonb` with `ok`, `doctype_key`, `label`, `permissions_created`, `grants_added`
- On error: Returns `{ok: false, error: "message"}` — transaction auto-rolls back

### Permission Auto-Provisioning

When the wizard creates a DocType, the bundle RPC:
1. Checks if each `permission_key` exists in `app.permissions`
2. If not, inserts it with `module_key` = the DocType's module and `sort_order = 999`
3. Finds `owner` and `admin` roles for the current company
4. Grants each new permission key to those roles via `app.company_role_permissions`
5. Does NOT grant to other roles (warehouse_manager, stock_operator, viewer, auditor)

### Sidebar Refresh

- `useWorkspaceNavigation()` now exposes a `refresh()` function
- `App.tsx` passes it through `DynamicRouteRenderer` → `MetadataStudioRouter` → `CustomDocTypeWizard`
- Wizard success screen shows a "Refresh Sidebar" button and an "Open Created DocType" button
- "Open Created DocType" navigates directly to the new DocType's list view

### Duplicate Validation

| Check | Where | Error Message |
|-------|-------|---------------|
| doctype_key exists | Client-side (API) + RPC | "DocType key already exists" |
| workspace item_key exists | Client-side (API) + RPC | "Workspace item key already exists" |
| Duplicate fieldnames | Client-side + RPC | Field-level error in wizard |
| Uppercase keys | Client-side (validation) | "Uppercase characters are not allowed" |

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

## Phase 4: GRN + Inventory Receipt (Design)

### Architecture Decision

GRN is the first inventory transaction. It uses **explicit physical tables** (`wh.*`) and **SECURITY DEFINER RPCs**, not generic JSON CRUD. This is the permanent boundary:

| Data Type | Storage | Write Path |
|-----------|---------|------------|
| Master data (products, warehouse, etc.) | `app.erp_documents` (generic_json) | `erp_create_document` etc. |
| Transactional inventory data (GRN, movements, batches, current inventory) | `wh.*` physical tables | Explicit `wh_*` RPCs only |

### Tables

| Table | Purpose |
|-------|---------|
| `wh.grns` | GRN header — company-scoped, status-based (draft/posted/cancelled) |
| `wh.grn_lines` | Line items with received/accepted/rejected quantities, batch, bin allocation |
| `wh.inventory_batches` | Batch/lot tracking per product |
| `wh.inventory_movements` | Immutable movement ledger — append-only |
| `wh.current_inventory` | Current on-hand and available quantity snapshot, upserted during posting |

### RPCs

| RPC | Purpose |
|-----|---------|
| `wh_create_grn_draft` | Create draft GRN with lines |
| `wh_update_grn_draft` | Update draft GRN |
| `wh_get_grn` | Get GRN with lines |
| `wh_list_grns` | List GRNs with filters |
| `wh_post_grn` | **Atomic posting** — validates, creates batches/movements, upserts current inventory in one transaction |

### Key Rules
- `received_qty > 0`, `accepted_qty >= 0`, `rejected_qty >= 0`
- `accepted_qty + rejected_qty <= received_qty`
- Batch/expiry rules from product metadata
- Bin allocation required for accepted quantity
- Posted GRN is read-only (cancellation creates reversal movements)
- All posting work inside one database transaction
- No direct table writes from frontend — always through RPCs
