# Hippo ERP Data & Component Flow

## Architecture Layers

```
User
  ↓
App.tsx
  ├── useAuth()                  → session, signOut, tenants, selectedTenantId
  ├── usePermissions()           → can, canAny, canAll, isCompanyAdmin
  ├── useWorkspaceNavigation()   → app.erp_workspaces + app.erp_workspace_items
  │
  ├── AppShell (layout wrapper)
  │   ├── WorkspaceSidebar       → grouped workspace navigation
  │   ├── TopBar                 → TenantSelector, user email, logout
  │   └── DynamicRouteRenderer   → maps selected item to view
  │
  └── DynamicRouteRenderer
      ├── DynamicListPage        → doctype items (metadata-driven list + form + detail)
      ├── CompanyProfileView     → company_profile page
      ├── UsersRolesView         → users_and_roles page
      ├── MetadataPrototype      → metadata_prototype (DEV only)
      └── ModuleView             → fallback page/report renderer

## Metadata Flow

Supabase (app.erp_* tables)
  ↓
src/lib/metadata/
  ├── workspace-api.ts     → getWorkspaceTree(), getWorkspaces(), getWorkspaceItems()
  ├── metadata-api.ts      → getDocTypeMeta(), getDocFields(), getFullDocTypeConfig(), etc.
  ├── doctype-registry.ts  → useDocTypeConfig() hook (cached)
  ├── types.ts             → TypeScript interfaces
  └── workspace-types.ts   → WorkspaceMeta, WorkspaceItemMeta, WorkspaceTreeItem

  ↓
src/components/metadata/
  ├── DynamicListPage       → metadata-driven list with search/filter/pagination/actions
  ├── DynamicFormPage        → metadata-driven create/edit form
  ├── DynamicDetailPage      → metadata-driven detail view
  ├── DynamicFieldRenderer   → renders typed fields (Data/Select/Link/Check/Int/Float/Date/...)
  ├── DynamicFilterBar       → renders standard filters from metadata
  ├── DynamicActionBar       → renders permission-aware action buttons
  ├── DynamicRouteRenderer   → maps workspace item to view
  ├── LinkField              → typeahead link selector
  ├── StatusField            → active/inactive badge
  └── doctype-api-map.ts     → maps DocType keys to existing RPCs

## Business Data Flow

Browser (React) → Supabase JS Client (anon key, RLS) → PostgREST → PostgreSQL
  - RLS policies enforce company scoping (tenant_id)
  - Authenticated reads via SELECT policies
  - Writes via SECURITY DEFINER RPC functions
  - Stock-changing transactions: explicit controlled services only
  - No service role in frontend

## Navigation Data Flow

Migration 0021 seeds app.erp_workspaces + app.erp_workspace_items
  ↓
useWorkspaceNavigation() loads workspaces + items (with permission filtering)
  ↓
WorkspaceSidebar renders Product Master (Products, Categories, UOM) + other workspaces
  ↓
Click item → DynamicRouteRenderer → DynamicListPage (for doctype items)
  ↓
DynamicListPage → useDocTypeConfig() → loadDocTypeConfig() from metadata-api.ts
  → renders columns, filters, actions from app.erp_list_views + app.erp_docfields

## State Management

- Auth state: AuthContext (React Context)
- Permissions: usePermissions() hook (fetched from member info)
- Workspace navigation: useWorkspaceNavigation() hook (fetches metadata)
- DocType config: useDocTypeConfig() hook (fetches metadata)
- Data operations: Direct Supabase calls via API modules (product-api.ts, etc.)
- Notifications: Sonner toast
