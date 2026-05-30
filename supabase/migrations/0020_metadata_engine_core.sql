-- 0020_metadata_engine_core.sql
-- Metadata-driven ERP core tables
-- Frappe-style DocType/DocField/DocPerm/List/Form/Workflow metadata on Supabase
-- Schema: app (alongside company/role/permission tables)

-- ── 1. ERP Modules ─────────────────────────────────────────────────────────────

create table if not exists app.erp_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  label text not null,
  description text,
  icon text,
  route text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 2. ERP DocTypes ──────────────────────────────────────────────────────────────

create table if not exists app.erp_doctypes (
  id uuid primary key default gen_random_uuid(),
  doctype_key text not null unique,
  module_key text not null references app.erp_modules(module_key),
  label text not null,
  description text,
  schema_name text not null,
  table_name text not null,
  route text,
  is_company_scoped boolean not null default true,
  is_submittable boolean not null default false,
  is_child_table boolean not null default false,
  is_single boolean not null default false,
  is_active boolean not null default true,
  default_order_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 3. ERP DocFields ─────────────────────────────────────────────────────────────

create table if not exists app.erp_docfields (
  id uuid primary key default gen_random_uuid(),
  doctype_key text not null references app.erp_doctypes(doctype_key),
  fieldname text not null,
  label text not null,
  fieldtype text not null,
  db_column text,
  options jsonb not null default '{}'::jsonb,
  is_required boolean not null default false,
  is_unique boolean not null default false,
  is_readonly boolean not null default false,
  is_hidden boolean not null default false,
  in_list_view boolean not null default false,
  in_standard_filter boolean not null default false,
  default_value text,
  validation_rules jsonb not null default '{}'::jsonb,
  depends_on jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doctype_key, fieldname)
);

-- ── 4. ERP DocType Actions ───────────────────────────────────────────────────────

create table if not exists app.erp_doctype_actions (
  id uuid primary key default gen_random_uuid(),
  doctype_key text not null references app.erp_doctypes(doctype_key),
  action_key text not null,
  permission_key text not null,
  created_at timestamptz not null default now(),
  unique (doctype_key, action_key)
);

-- ── 5. ERP List Views ────────────────────────────────────────────────────────────

create table if not exists app.erp_list_views (
  id uuid primary key default gen_random_uuid(),
  doctype_key text not null references app.erp_doctypes(doctype_key),
  view_key text not null,
  label text not null,
  columns_json jsonb not null,
  filters_json jsonb not null default '[]'::jsonb,
  search_fields_json jsonb not null default '[]'::jsonb,
  sort_json jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 6. ERP Form Layouts ──────────────────────────────────────────────────────────

create table if not exists app.erp_form_layouts (
  id uuid primary key default gen_random_uuid(),
  doctype_key text not null references app.erp_doctypes(doctype_key),
  layout_key text not null,
  label text not null,
  sections_json jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 7. ERP Naming Series ─────────────────────────────────────────────────────────

create table if not exists app.erp_naming_series (
  id uuid primary key default gen_random_uuid(),
  doctype_key text not null references app.erp_doctypes(doctype_key),
  company_id uuid references app.tenants(id),
  prefix text not null,
  year_format text not null default 'YYYY',
  current_number int not null default 0,
  padding int not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doctype_key, company_id, prefix, year_format)
);

-- ── 8. ERP Workflows ─────────────────────────────────────────────────────────────

create table if not exists app.erp_workflows (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null unique,
  doctype_key text not null references app.erp_doctypes(doctype_key),
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.erp_workflow_states (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null references app.erp_workflows(workflow_key) on delete cascade,
  state_key text not null,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (workflow_key, state_key)
);

create table if not exists app.erp_workflow_transitions (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null references app.erp_workflows(workflow_key) on delete cascade,
  from_state text not null,
  to_state text not null,
  action_label text not null,
  required_permission_key text,
  created_at timestamptz not null default now()
);

-- ── RLS: Enable Row-Level Security ───────────────────────────────────────────────

alter table app.erp_modules enable row level security;
alter table app.erp_doctypes enable row level security;
alter table app.erp_docfields enable row level security;
alter table app.erp_doctype_actions enable row level security;
alter table app.erp_list_views enable row level security;
alter table app.erp_form_layouts enable row level security;
alter table app.erp_naming_series enable row level security;
alter table app.erp_workflows enable row level security;
alter table app.erp_workflow_states enable row level security;
alter table app.erp_workflow_transitions enable row level security;

-- ── RLS: Read Policies ──────────────────────────────────────────────────────────
-- Any authenticated user can read metadata (metadata is global, not company-specific)

create policy erp_modules_read on app.erp_modules for select
  using (auth.role() = 'authenticated');

create policy erp_doctypes_read on app.erp_doctypes for select
  using (auth.role() = 'authenticated');

create policy erp_docfields_read on app.erp_docfields for select
  using (auth.role() = 'authenticated');

create policy erp_doctype_actions_read on app.erp_doctype_actions for select
  using (auth.role() = 'authenticated');

create policy erp_list_views_read on app.erp_list_views for select
  using (auth.role() = 'authenticated');

create policy erp_form_layouts_read on app.erp_form_layouts for select
  using (auth.role() = 'authenticated');

create policy erp_naming_series_read on app.erp_naming_series for select
  using (auth.role() = 'authenticated');

create policy erp_workflows_read on app.erp_workflows for select
  using (auth.role() = 'authenticated');

create policy erp_workflow_states_read on app.erp_workflow_states for select
  using (auth.role() = 'authenticated');

create policy erp_workflow_transitions_read on app.erp_workflow_transitions for select
  using (auth.role() = 'authenticated');

-- ── RLS: Write Policies ─────────────────────────────────────────────────────────
-- Metadata writes are restricted to platform owners/admins only in this phase.
-- Data is seeded through migrations; no UI writes allowed.

create policy erp_modules_write_owner on app.erp_modules for insert using (false);
create policy erp_modules_write_owner on app.erp_modules for update using (false);
create policy erp_modules_write_owner on app.erp_modules for delete using (false);

create policy erp_doctypes_write_owner on app.erp_doctypes for insert using (false);
create policy erp_doctypes_write_owner on app.erp_doctypes for update using (false);
create policy erp_doctypes_write_owner on app.erp_doctypes for delete using (false);

create policy erp_docfields_write_owner on app.erp_docfields for insert using (false);
create policy erp_docfields_write_owner on app.erp_docfields for update using (false);
create policy erp_docfields_write_owner on app.erp_docfields for delete using (false);

create policy erp_doctype_actions_write_owner on app.erp_doctype_actions for insert using (false);
create policy erp_doctype_actions_write_owner on app.erp_doctype_actions for update using (false);
create policy erp_doctype_actions_write_owner on app.erp_doctype_actions for delete using (false);

create policy erp_list_views_write_owner on app.erp_list_views for insert using (false);
create policy erp_list_views_write_owner on app.erp_list_views for update using (false);
create policy erp_list_views_write_owner on app.erp_list_views for delete using (false);

create policy erp_form_layouts_write_owner on app.erp_form_layouts for insert using (false);
create policy erp_form_layouts_write_owner on app.erp_form_layouts for update using (false);
create policy erp_form_layouts_write_owner on app.erp_form_layouts for delete using (false);

create policy erp_naming_series_write_owner on app.erp_naming_series for insert using (false);
create policy erp_naming_series_write_owner on app.erp_naming_series for update using (false);
create policy erp_naming_series_write_owner on app.erp_naming_series for delete using (false);

create policy erp_workflows_write_owner on app.erp_workflows for insert using (false);
create policy erp_workflows_write_owner on app.erp_workflows for update using (false);
create policy erp_workflows_write_owner on app.erp_workflows for delete using (false);

create policy erp_workflow_states_write_owner on app.erp_workflow_states for insert using (false);
create policy erp_workflow_states_write_owner on app.erp_workflow_states for update using (false);
create policy erp_workflow_states_write_owner on app.erp_workflow_states for delete using (false);

create policy erp_workflow_transitions_write_owner on app.erp_workflow_transitions for insert using (false);
create policy erp_workflow_transitions_write_owner on app.erp_workflow_transitions for update using (false);
create policy erp_workflow_transitions_write_owner on app.erp_workflow_transitions for delete using (false);

-- ── Seed: ERP Modules ───────────────────────────────────────────────────────────

insert into app.erp_modules (module_key, label, description, icon, route, sort_order, is_active) values
  ('product_master', 'Product Master', 'Product categories, units of measure, and SKU management', 'PackageSearch', '/products', 10, true),
  ('inventory', 'Inventory', 'Stock, movements, transfers, and adjustments', 'Boxes', '/inventory', 20, true),
  ('warehouse', 'Warehouse', 'Warehouse hierarchy and bin management', 'Warehouse', '/warehouse', 30, false),
  ('purchasing', 'Purchasing', 'GRN and supplier management', 'ReceiptText', '/grn', 40, false),
  ('reporting', 'Reporting', 'Inventory valuation and analytics', 'BarChart3', '/reports', 50, false)
on conflict (module_key) do nothing;

-- ── Seed: DocTypes ──────────────────────────────────────────────────────────────

insert into app.erp_doctypes (doctype_key, module_key, label, description, schema_name, table_name, route, is_company_scoped, is_submittable, is_child_table, is_single, is_active, default_order_by) values
  ('product_category', 'product_master', 'Product Category', 'Product categorization hierarchy', 'wh', 'product_categories', '/products/categories', true, false, false, false, true, 'code asc'),
  ('unit_of_measure', 'product_master', 'Unit of Measure', 'Measurement units for products', 'wh', 'units_of_measure', '/products/uom', true, false, false, false, true, 'code asc'),
  ('product', 'product_master', 'Product', 'Product/SKU master record', 'wh', 'products', '/products', true, false, false, false, true, 'sku asc')
on conflict (doctype_key) do nothing;

-- ── Seed: DocFields - product_category ───────────────────────────────────────────

insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, db_column, options, is_required, is_unique, is_readonly, is_hidden, in_list_view, in_standard_filter, sort_order) values
  ('product_category', 'id', 'ID', 'uuid', 'id', '{"hidden": true}', false, false, true, true, false, false, 0),
  ('product_category', 'tenant_id', 'Company', 'uuid', 'tenant_id', '{"hidden": true}', false, false, true, true, false, false, 1),
  ('product_category', 'code', 'Code', 'Data', 'code', '{}', true, true, false, false, true, true, 10),
  ('product_category', 'name', 'Name', 'Data', 'name', '{}', true, false, false, false, true, false, 20),
  ('product_category', 'description', 'Description', 'Text', 'description', '{}', false, false, false, false, false, false, 30),
  ('product_category', 'parent_category_id', 'Parent Category', 'Link', 'parent_category_id', '{"link_to": "product_category", "display_field": "code"}', false, false, false, false, false, false, 40),
  ('product_category', 'sort_order', 'Sort Order', 'Int', 'sort_order', '{}', false, false, false, false, false, false, 50),
  ('product_category', 'category_type', 'Category Type', 'Data', 'category_type', '{}', false, false, false, false, false, false, 60),
  ('product_category', 'is_active', 'Active', 'Check', 'is_active', '{}', false, false, false, false, true, true, 70),
  ('product_category', 'created_by', 'Created By', 'uuid', 'created_by', '{"hidden": true}', false, false, true, false, false, false, 80),
  ('product_category', 'updated_by', 'Updated By', 'uuid', 'updated_by', '{"hidden": true}', false, false, true, false, false, false, 90),
  ('product_category', 'created_at', 'Created At', 'Datetime', 'created_at', '{}', false, false, true, false, false, false, 100),
  ('product_category', 'updated_at', 'Updated At', 'Datetime', 'updated_at', '{}', false, false, true, false, false, false, 110)
on conflict (doctype_key, fieldname) do nothing;

-- ── Seed: DocFields - unit_of_measure ────────────────────────────────────────────

insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, db_column, options, is_required, is_unique, is_readonly, is_hidden, in_list_view, in_standard_filter, sort_order) values
  ('unit_of_measure', 'id', 'ID', 'uuid', 'id', '{"hidden": true}', false, false, true, true, false, false, 0),
  ('unit_of_measure', 'tenant_id', 'Company', 'uuid', 'tenant_id', '{"hidden": true}', false, false, true, true, false, false, 1),
  ('unit_of_measure', 'code', 'Code', 'Data', 'code', '{}', true, true, false, false, true, true, 10),
  ('unit_of_measure', 'name', 'Name', 'Data', 'name', '{}', true, false, false, false, true, false, 20),
  ('unit_of_measure', 'description', 'Description', 'Text', 'description', '{}', false, false, false, false, false, false, 30),
  ('unit_of_measure', 'symbol', 'Symbol', 'Data', 'symbol', '{}', false, false, false, false, false, false, 40),
  ('unit_of_measure', 'decimal_precision', 'Decimal Precision', 'Int', 'decimal_precision', '{}', false, false, false, false, false, false, 50),
  ('unit_of_measure', 'uom_type', 'UOM Type', 'Data', 'uom_type', '{}', false, false, false, false, false, false, 60),
  ('unit_of_measure', 'is_active', 'Active', 'Check', 'is_active', '{}', false, false, false, false, true, true, 70),
  ('unit_of_measure', 'created_by', 'Created By', 'uuid', 'created_by', '{"hidden": true}', false, false, true, false, false, false, 80),
  ('unit_of_measure', 'updated_by', 'Updated By', 'uuid', 'updated_by', '{"hidden": true}', false, false, true, false, false, false, 90),
  ('unit_of_measure', 'created_at', 'Created At', 'Datetime', 'created_at', '{}', false, false, true, false, false, false, 100),
  ('unit_of_measure', 'updated_at', 'Updated At', 'Datetime', 'updated_at', '{}', false, false, true, false, false, false, 110)
on conflict (doctype_key, fieldname) do nothing;

-- ── Seed: DocFields - product ────────────────────────────────────────────────────

insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, db_column, options, is_required, is_unique, is_readonly, is_hidden, in_list_view, in_standard_filter, sort_order) values
  ('product', 'id', 'ID', 'uuid', 'id', '{"hidden": true}', false, false, true, true, false, false, 0),
  ('product', 'tenant_id', 'Company', 'uuid', 'tenant_id', '{"hidden": true}', false, false, true, true, false, false, 1),
  ('product', 'sku', 'SKU', 'Data', 'sku', '{}', true, true, false, false, true, true, 10),
  ('product', 'name', 'Name', 'Data', 'name', '{}', true, false, false, false, true, false, 20),
  ('product', 'description', 'Description', 'Text', 'description', '{}', false, false, false, false, false, false, 30),
  ('product', 'category_id', 'Category', 'Link', 'category_id', '{"link_to": "product_category", "display_field": "code"}', true, false, false, false, true, true, 40),
  ('product', 'uom_id', 'UOM', 'Link', 'uom_id', '{"link_to": "unit_of_measure", "display_field": "code"}', true, false, false, false, true, false, 50),
  ('product', 'barcode', 'Barcode', 'Data', 'barcode', '{}', false, false, false, false, false, true, 60),
  ('product', 'qr_value', 'QR Value', 'Data', 'qr_value', '{}', false, false, false, false, false, false, 70),
  ('product', 'reorder_point', 'Reorder Point', 'Float', 'reorder_point', '{}', false, false, false, false, true, false, 80),
  ('product', 'reorder_quantity', 'Reorder Quantity', 'Float', 'reorder_quantity', '{}', false, false, false, false, true, false, 90),
  ('product', 'batch_tracking', 'Batch Tracking', 'Check', 'batch_tracking', '{}', false, false, false, false, true, true, 100),
  ('product', 'expiry_tracking', 'Expiry Tracking', 'Check', 'expiry_tracking', '{}', false, false, false, false, true, false, 110),
  ('product', 'is_active', 'Active', 'Check', 'is_active', '{}', false, false, false, false, true, true, 120),
  ('product', 'created_by', 'Created By', 'uuid', 'created_by', '{"hidden": true}', false, false, true, false, false, false, 130),
  ('product', 'updated_by', 'Updated By', 'uuid', 'updated_by', '{"hidden": true}', false, false, true, false, false, false, 140),
  ('product', 'created_at', 'Created At', 'Datetime', 'created_at', '{}', false, false, true, false, false, false, 150),
  ('product', 'updated_at', 'Updated At', 'Datetime', 'updated_at', '{}', false, false, true, false, false, false, 160)
on conflict (doctype_key, fieldname) do nothing;

-- ── Seed: DocType Actions ────────────────────────────────────────────────────────

insert into app.erp_doctype_actions (doctype_key, action_key, permission_key) values
  ('product_category', 'read', 'view_products'),
  ('product_category', 'create', 'create_product'),
  ('product_category', 'update', 'update_product'),
  ('product_category', 'deactivate', 'delete_product'),
  ('unit_of_measure', 'read', 'view_products'),
  ('unit_of_measure', 'create', 'create_product'),
  ('unit_of_measure', 'update', 'update_product'),
  ('unit_of_measure', 'deactivate', 'delete_product'),
  ('product', 'read', 'view_products'),
  ('product', 'create', 'create_product'),
  ('product', 'update', 'update_product'),
  ('product', 'deactivate', 'delete_product')
on conflict (doctype_key, action_key) do nothing;

-- ── Seed: List Views - product_category ──────────────────────────────────────────

insert into app.erp_list_views (doctype_key, view_key, label, columns_json, filters_json, search_fields_json, sort_json, is_default) values
  ('product_category', 'default', 'Default', '[
    {"fieldname": "code", "label": "Code", "width": 120},
    {"fieldname": "name", "label": "Name", "width": 200},
    {"fieldname": "description", "label": "Description", "width": 250},
    {"fieldname": "is_active", "label": "Status", "width": 80}
  ]', '[{"fieldname": "is_active", "label": "Status", "type": "select", "options": ["all","active","inactive"]}]',
  '["code","name"]', '{"fieldname": "code", "direction": "asc"}', true)
on conflict (doctype_key, view_key) do nothing;

-- ── Seed: List Views - unit_of_measure ───────────────────────────────────────────

insert into app.erp_list_views (doctype_key, view_key, label, columns_json, filters_json, search_fields_json, sort_json, is_default) values
  ('unit_of_measure', 'default', 'Default', '[
    {"fieldname": "code", "label": "Code", "width": 100},
    {"fieldname": "name", "label": "Name", "width": 200},
    {"fieldname": "description", "label": "Description", "width": 250},
    {"fieldname": "is_active", "label": "Status", "width": 80}
  ]', '[{"fieldname": "is_active", "label": "Status", "type": "select", "options": ["all","active","inactive"]}]',
  '["code","name"]', '{"fieldname": "code", "direction": "asc"}', true)
on conflict (doctype_key, view_key) do nothing;

-- ── Seed: List Views - product ───────────────────────────────────────────────────

insert into app.erp_list_views (doctype_key, view_key, label, columns_json, filters_json, search_fields_json, sort_json, is_default) values
  ('product', 'default', 'Default', '[
    {"fieldname": "sku", "label": "SKU", "width": 120},
    {"fieldname": "name", "label": "Name", "width": 200},
    {"fieldname": "category_id", "label": "Category", "width": 120},
    {"fieldname": "uom_id", "label": "UOM", "width": 80},
    {"fieldname": "reorder_point", "label": "ROP", "width": 60},
    {"fieldname": "reorder_quantity", "label": "ROQ", "width": 60},
    {"fieldname": "batch_tracking", "label": "Batch", "width": 70},
    {"fieldname": "expiry_tracking", "label": "Expiry", "width": 70},
    {"fieldname": "is_active", "label": "Status", "width": 80}
  ]', '[{"fieldname": "is_active", "label": "Status", "type": "select", "options": ["all","active","inactive"]}, {"fieldname": "category_id", "label": "Category", "type": "link", "doctype": "product_category"}]',
  '["sku","name","barcode"]', '{"fieldname": "sku", "direction": "asc"}', true)
on conflict (doctype_key, view_key) do nothing;

-- ── Seed: Form Layouts - product_category ────────────────────────────────────────

insert into app.erp_form_layouts (doctype_key, layout_key, label, sections_json, is_default) values
  ('product_category', 'default', 'Default', '[
    {"section": "Basic Info", "columns": 2, "fields": ["code", "name", "description", "parent_category_id", "sort_order", "category_type", "is_active"]},
    {"section": "Audit", "columns": 2, "fields": ["created_by", "updated_by", "created_at", "updated_at"]}
  ]', true)
on conflict (doctype_key, layout_key) do nothing;

-- ── Seed: Form Layouts - unit_of_measure ─────────────────────────────────────────

insert into app.erp_form_layouts (doctype_key, layout_key, label, sections_json, is_default) values
  ('unit_of_measure', 'default', 'Default', '[
    {"section": "Basic Info", "columns": 2, "fields": ["code", "name", "description", "symbol", "decimal_precision", "uom_type", "is_active"]},
    {"section": "Audit", "columns": 2, "fields": ["created_by", "updated_by", "created_at", "updated_at"]}
  ]', true)
on conflict (doctype_key, layout_key) do nothing;

-- ── Seed: Form Layouts - product ─────────────────────────────────────────────────

insert into app.erp_form_layouts (doctype_key, layout_key, label, sections_json, is_default) values
  ('product', 'default', 'Default', '[
    {"section": "Basic Info", "columns": 2, "fields": ["sku", "name", "description", "category_id", "uom_id"]},
    {"section": "Identification", "columns": 2, "fields": ["barcode", "qr_value"]},
    {"section": "Reorder Planning", "columns": 2, "fields": ["reorder_point", "reorder_quantity"]},
    {"section": "Tracking", "columns": 2, "fields": ["batch_tracking", "expiry_tracking"]},
    {"section": "Audit", "columns": 2, "fields": ["created_by", "updated_by", "created_at", "updated_at"]}
  ]', true)
on conflict (doctype_key, layout_key) do nothing;
