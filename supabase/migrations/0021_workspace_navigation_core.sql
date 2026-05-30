-- 0021_workspace_navigation_core.sql
-- Workspace and navigation metadata for Phase 2.6
-- Schema: app

-- ── 1. ERP Workspaces ──────────────────────────────────────────────────────────

create table if not exists app.erp_workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null unique,
  label text not null,
  description text,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 2. ERP Workspace Items ─────────────────────────────────────────────────────

create table if not exists app.erp_workspace_items (
  id uuid primary key default gen_random_uuid(),
  workspace_key text not null references app.erp_workspaces(workspace_key),
  item_key text not null,
  label text not null,
  item_type text not null check (item_type in ('doctype', 'workspace', 'page', 'report', 'external')),
  target text not null,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  required_permission_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_key, item_key)
);

-- ── 3. RLS ────────────────────────────────────────────────────────────────────

alter table app.erp_workspaces enable row level security;
alter table app.erp_workspace_items enable row level security;

-- Authenticated users can read active workspace metadata
create policy "authenticated can read active workspaces"
  on app.erp_workspaces for select
  to authenticated
  using (is_active = true);

create policy "authenticated can read active workspace items"
  on app.erp_workspace_items for select
  to authenticated
  using (true);

-- Anonymous cannot read
create policy "no anonymous select on workspaces"
  on app.erp_workspaces for select
  to anon
  using (false);

create policy "no anonymous select on workspace_items"
  on app.erp_workspace_items for select
  to anon
  using (false);

-- No frontend insert/update/delete for this phase
create policy "no insert on workspaces"
  on app.erp_workspaces for insert
  to authenticated
  with check (false);

create policy "no update on workspaces"
  on app.erp_workspaces for update
  to authenticated
  using (false);

create policy "no delete on workspaces"
  on app.erp_workspaces for delete
  to authenticated
  using (false);

create policy "no insert on workspace_items"
  on app.erp_workspace_items for insert
  to authenticated
  with check (false);

create policy "no update on workspace_items"
  on app.erp_workspace_items for update
  to authenticated
  using (false);

create policy "no delete on workspace_items"
  on app.erp_workspace_items for delete
  to authenticated
  using (false);

-- ── 4. Seeds: Product Master Workspace ─────────────────────────────────────────

insert into app.erp_workspaces (workspace_key, label, description, icon, sort_order, is_active)
values
  ('product_master', 'Product Master', 'Manage products, categories, and units of measure', 'PackageSearch', 10, true),
  ('warehouse', 'Warehouse', 'Warehouse hierarchy and bin management', 'Waypoints', 20, false),
  ('inventory', 'Inventory', 'Stock, batches, movements and adjustments', 'Boxes', 30, false),
  ('purchasing', 'Purchasing', 'Purchase orders, GRN, and supplier management', 'Truck', 40, false),
  ('reports', 'Reports', 'Inventory valuation and analytics reports', 'ClipboardList', 50, false)
on conflict (workspace_key) do nothing;

insert into app.erp_workspace_items (workspace_key, item_key, label, item_type, target, icon, sort_order, is_active, required_permission_key)
values
  -- Product Master children
  ('product_master', 'products', 'Products', 'doctype', 'product', 'PackageSearch', 10, true, 'view_products'),
  ('product_master', 'product_categories', 'Product Categories', 'doctype', 'product_category', 'LibraryBig', 20, true, 'view_products'),
  ('product_master', 'units_of_measure', 'Units of Measure', 'doctype', 'unit_of_measure', 'Ruler', 30, true, 'view_products'),

  -- Inactive placeholders
  ('warehouse', 'warehouses', 'Warehouses', 'doctype', 'warehouse', 'Warehouse', 10, false, 'view_warehouses'),
  ('warehouse', 'zones', 'Zones', 'doctype', 'zone', 'Waypoints', 20, false, 'view_warehouses'),
  ('inventory', 'current_stock', 'Current Stock', 'page', '/inventory/current-stock', 'Boxes', 10, false, 'view_stock'),
  ('inventory', 'batches', 'Batches', 'page', '/inventory/batches', 'CalendarRange', 20, false, 'view_stock'),
  ('inventory', 'movements', 'Movements Ledger', 'page', '/inventory/movements', 'DatabaseZap', 30, false, 'view_movements'),
  ('purchasing', 'grn', 'GRN', 'page', '/grn', 'ReceiptText', 10, false, 'view_grn'),
  ('reports', 'valuation', 'Inventory Valuation', 'report', '/reports/inventory-valuation', 'ClipboardList', 10, false, 'view_reports')
on conflict (workspace_key, item_key) do nothing;
