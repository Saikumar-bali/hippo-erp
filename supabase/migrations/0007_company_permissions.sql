create table if not exists app.permissions (
  permission_key text primary key,
  module_key text not null,
  module_label text not null,
  permission_label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.role_permission_grants (
  role app.role_type not null,
  permission_key text not null references app.permissions(permission_key) on delete cascade,
  is_granted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role, permission_key)
);

alter table app.permissions enable row level security;
alter table app.role_permission_grants enable row level security;

drop policy if exists permissions_read on app.permissions;
create policy permissions_read on app.permissions
for select
to authenticated
using (true);

drop policy if exists role_permission_grants_read on app.role_permission_grants;
create policy role_permission_grants_read on app.role_permission_grants
for select
to authenticated
using (true);

drop policy if exists permissions_manage on app.permissions;
create policy permissions_manage on app.permissions
for all
to authenticated
using (false)
with check (false);

drop policy if exists role_permission_grants_manage on app.role_permission_grants;
create policy role_permission_grants_manage on app.role_permission_grants
for all
to authenticated
using (false)
with check (false);

grant select on app.permissions to authenticated;
grant select on app.role_permission_grants to authenticated;

alter default privileges in schema app grant select on tables to authenticated;

comment on table app.permissions is 'Global company permission catalog grouped by ERP module.';
comment on table app.role_permission_grants is 'Default role-to-permission matrix for company roles.';

insert into app.permissions (
  permission_key, module_key, module_label, permission_label, description, sort_order
)
values
  ('view_company', 'company', 'Company', 'View Company', 'View the current company profile and context.', 10),
  ('update_company', 'company', 'Company', 'Update Company', 'Edit the current company profile.', 20),
  ('view_users', 'users', 'Users', 'View Users', 'View users within the current company.', 10),
  ('invite_user', 'users', 'Users', 'Invite User', 'Invite a user to the current company.', 20),
  ('update_user', 'users', 'Users', 'Update User', 'Update user profile or role assignments.', 30),
  ('deactivate_user', 'users', 'Users', 'Deactivate User', 'Deactivate a user in the current company.', 40),
  ('view_roles', 'roles', 'Roles', 'View Roles', 'View custom roles and grants.', 10),
  ('create_role', 'roles', 'Roles', 'Create Role', 'Create a new custom role.', 20),
  ('update_role', 'roles', 'Roles', 'Update Role', 'Update a custom role.', 30),
  ('delete_role', 'roles', 'Roles', 'Delete Role', 'Delete a custom role.', 40),
  ('assign_role', 'roles', 'Roles', 'Assign Role', 'Assign roles to users.', 50),
  ('view_products', 'products', 'Products', 'View Products', 'View product master data.', 10),
  ('create_product', 'products', 'Products', 'Create Product', 'Create a product master record.', 20),
  ('update_product', 'products', 'Products', 'Update Product', 'Update a product master record.', 30),
  ('delete_product', 'products', 'Products', 'Delete Product', 'Delete a product master record.', 40),
  ('view_warehouses', 'warehouse', 'Warehouse', 'View Warehouses', 'View warehouse hierarchy data.', 10),
  ('create_warehouse', 'warehouse', 'Warehouse', 'Create Warehouse', 'Create a warehouse or location node.', 20),
  ('update_warehouse', 'warehouse', 'Warehouse', 'Update Warehouse', 'Update a warehouse or location node.', 30),
  ('delete_warehouse', 'warehouse', 'Warehouse', 'Delete Warehouse', 'Delete a warehouse or location node.', 40),
  ('manage_bins', 'warehouse', 'Warehouse', 'Manage Bins', 'Create or manage bins and storage locations.', 50),
  ('view_grn', 'grn', 'GRN', 'View GRN', 'View goods receipt documents.', 10),
  ('create_grn', 'grn', 'GRN', 'Create GRN', 'Create a goods receipt document.', 20),
  ('update_grn', 'grn', 'GRN', 'Update GRN', 'Update a draft or pending GRN.', 30),
  ('qc_grn', 'grn', 'GRN', 'QC GRN', 'Perform GRN quality control.', 40),
  ('approve_grn', 'grn', 'GRN', 'Approve GRN', 'Approve a GRN before posting.', 50),
  ('post_grn', 'grn', 'GRN', 'Post GRN', 'Post inventory from a GRN.', 60),
  ('view_stock', 'inventory', 'Inventory', 'View Stock', 'View stock balances and availability.', 10),
  ('view_movements', 'inventory', 'Inventory', 'View Movements', 'View inventory movement ledger.', 20),
  ('transfer_stock', 'inventory', 'Inventory', 'Transfer Stock', 'Create or complete stock transfers.', 30),
  ('adjust_stock', 'inventory', 'Inventory', 'Adjust Stock', 'Create stock adjustment requests.', 40),
  ('approve_adjustment', 'inventory', 'Inventory', 'Approve Adjustment', 'Approve stock adjustments.', 50),
  ('reserve_stock', 'inventory', 'Inventory', 'Reserve Stock', 'Reserve inventory for an order or reference.', 60),
  ('view_reports', 'reports', 'Reports', 'View Reports', 'View inventory and ERP reports.', 10),
  ('export_reports', 'reports', 'Reports', 'Export Reports', 'Export report data.', 20),
  ('view_dashboard', 'dashboard', 'Dashboard', 'View Dashboard', 'View the ERP dashboard.', 10),
  ('submit_document', 'documents', 'ERP Documents', 'Submit Document', 'Submit a transactional ERP document.', 10),
  ('cancel_document', 'documents', 'ERP Documents', 'Cancel Document', 'Cancel a transactional ERP document.', 20),
  ('view_audit_history', 'documents', 'ERP Documents', 'View Audit History', 'View document history and audit trail.', 30)
on conflict (permission_key) do update
set
  module_key = excluded.module_key,
  module_label = excluded.module_label,
  permission_label = excluded.permission_label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into app.role_permission_grants (role, permission_key, is_granted)
select r.role, p.permission_key, true
from (values
  ('owner'::app.role_type, true),
  ('admin'::app.role_type, true)
) as r(role, grant_all)
cross join app.permissions p
where r.grant_all
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

insert into app.role_permission_grants (role, permission_key, is_granted)
select 'warehouse_manager'::app.role_type, p.permission_key, true
from app.permissions p
where p.permission_key in (
  'view_company',
  'view_products',
  'create_product',
  'update_product',
  'view_warehouses',
  'create_warehouse',
  'update_warehouse',
  'manage_bins',
  'view_grn',
  'create_grn',
  'update_grn',
  'qc_grn',
  'approve_grn',
  'post_grn',
  'view_stock',
  'view_movements',
  'transfer_stock',
  'adjust_stock',
  'approve_adjustment',
  'reserve_stock',
  'view_reports',
  'export_reports',
  'view_dashboard',
  'submit_document',
  'cancel_document',
  'view_audit_history'
)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

insert into app.role_permission_grants (role, permission_key, is_granted)
select 'stock_operator'::app.role_type, p.permission_key, true
from app.permissions p
where p.permission_key in (
  'view_company',
  'view_products',
  'view_warehouses',
  'view_grn',
  'create_grn',
  'update_grn',
  'view_stock',
  'view_movements',
  'transfer_stock',
  'adjust_stock',
  'reserve_stock',
  'view_reports',
  'view_dashboard',
  'view_audit_history'
)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

insert into app.role_permission_grants (role, permission_key, is_granted)
select 'viewer'::app.role_type, p.permission_key, true
from app.permissions p
where p.permission_key in (
  'view_company',
  'view_products',
  'view_warehouses',
  'view_grn',
  'view_stock',
  'view_movements',
  'view_reports',
  'view_dashboard',
  'view_audit_history'
)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

insert into app.role_permission_grants (role, permission_key, is_granted)
select 'auditor'::app.role_type, p.permission_key, true
from app.permissions p
where p.permission_key in (
  'view_company',
  'view_users',
  'view_roles',
  'view_products',
  'view_warehouses',
  'view_grn',
  'view_stock',
  'view_movements',
  'view_reports',
  'export_reports',
  'view_dashboard',
  'view_audit_history'
)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();
