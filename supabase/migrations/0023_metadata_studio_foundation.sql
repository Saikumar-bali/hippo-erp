-- 0023_metadata_studio_foundation.sql
-- Phase 2.7: Metadata Studio / Developer Side foundation
-- Schema: app
--
-- 1. Seed manage_metadata permission
-- 2. Create audit_logs and metadata_change_requests tables
-- 3. Seed Metadata Studio workspace + items
-- 4. RLS on new tables

-- ── 1. manage_metadata permission ────────────────────────────────────────────

insert into app.permissions (
  permission_key, module_key, module_label, permission_label, description, sort_order
)
values (
  'manage_metadata',
  'developer',
  'Developer',
  'Manage Metadata',
  'Access Metadata Studio and manage ERP metadata configuration.',
  10
)
on conflict (permission_key) do update
set
  module_key = excluded.module_key,
  module_label = excluded.module_label,
  permission_label = excluded.permission_label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- Grant manage_metadata to owner and admin system roles
insert into app.role_permission_grants (role, permission_key, is_granted)
values
  ('owner'::app.role_type, 'manage_metadata', true),
  ('admin'::app.role_type, 'manage_metadata', true)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

-- ── 2. Audit Logs Table ──────────────────────────────────────────────────────

create table if not exists app.erp_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

alter table app.erp_audit_logs enable row level security;

drop policy if exists "authenticated can read audit logs" on app.erp_audit_logs;
create policy "authenticated can read audit logs"
  on app.erp_audit_logs for select
  to authenticated
  using (true);

drop policy if exists "no insert on audit logs" on app.erp_audit_logs;
create policy "no insert on audit logs"
  on app.erp_audit_logs for insert
  to authenticated
  with check (false);

drop policy if exists "no update on audit logs" on app.erp_audit_logs;
create policy "no update on audit logs"
  on app.erp_audit_logs for update
  to authenticated
  using (false);

drop policy if exists "no delete on audit logs" on app.erp_audit_logs;
create policy "no delete on audit logs"
  on app.erp_audit_logs for delete
  to authenticated
  using (false);

-- ── 3. Metadata Change Requests Table ────────────────────────────────────────

create table if not exists app.erp_metadata_change_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  requested_by uuid not null,
  reviewed_by uuid,
  table_name text not null,
  record_id uuid,
  change_type text not null check (change_type in ('create', 'update', 'delete')),
  proposed_changes jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table app.erp_metadata_change_requests enable row level security;

drop policy if exists "authenticated can read change requests" on app.erp_metadata_change_requests;
create policy "authenticated can read change requests"
  on app.erp_metadata_change_requests for select
  to authenticated
  using (true);

drop policy if exists "no insert on change requests" on app.erp_metadata_change_requests;
create policy "no insert on change requests"
  on app.erp_metadata_change_requests for insert
  to authenticated
  with check (false);

drop policy if exists "no update on change requests" on app.erp_metadata_change_requests;
create policy "no update on change requests"
  on app.erp_metadata_change_requests for update
  to authenticated
  using (false);

drop policy if exists "no delete on change requests" on app.erp_metadata_change_requests;
create policy "no delete on change requests"
  on app.erp_metadata_change_requests for delete
  to authenticated
  using (false);

-- ── 4. Metadata Studio Workspace ─────────────────────────────────────────────

insert into app.erp_workspaces (workspace_key, label, description, icon, sort_order, is_active)
values
  ('metadata_studio', 'Metadata Studio', 'Inspect and manage ERP metadata configuration', 'Cog', 5, true)
on conflict (workspace_key) do nothing;

insert into app.erp_workspace_items (workspace_key, item_key, label, item_type, target, icon, sort_order, is_active, required_permission_key)
values
  ('metadata_studio', 'metadata_studio_doctypes', 'DocTypes', 'page', 'metadata_studio_doctypes', 'FileJson', 10, true, 'manage_metadata'),
  ('metadata_studio', 'metadata_studio_docfields', 'DocFields', 'page', 'metadata_studio_docfields', 'Columns3', 20, true, 'manage_metadata'),
  ('metadata_studio', 'metadata_studio_workspaces', 'Workspaces', 'page', 'metadata_studio_workspaces', 'LayoutDashboard', 30, true, 'manage_metadata'),
  ('metadata_studio', 'metadata_studio_workspace_items', 'Workspace Items', 'page', 'metadata_studio_workspace_items', 'ListTree', 40, true, 'manage_metadata'),
  ('metadata_studio', 'metadata_studio_list_views', 'List Views', 'page', 'metadata_studio_list_views', 'Table', 50, true, 'manage_metadata'),
  ('metadata_studio', 'metadata_studio_form_layouts', 'Form Layouts', 'page', 'metadata_studio_form_layouts', 'LayoutTemplate', 60, true, 'manage_metadata'),
  ('metadata_studio', 'metadata_studio_actions', 'DocType Actions', 'page', 'metadata_studio_actions', 'ShieldCheck', 70, true, 'manage_metadata'),
  ('metadata_studio', 'metadata_studio_naming_series', 'Naming Series', 'page', 'metadata_studio_naming_series', 'Hash', 80, true, 'manage_metadata'),
  ('metadata_studio', 'metadata_studio_workflows', 'Workflows', 'page', 'metadata_studio_workflows', 'GitBranch', 90, true, 'manage_metadata')
on conflict (workspace_key, item_key) do nothing;

-- Also update the create_company_role function to auto-grant manage_metadata
-- to owner and admin company roles
create or replace function public.create_company_role(
  p_company_id uuid,
  p_role_key text,
  p_role_name text,
  p_description text default null,
  p_sort_order int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_role_id uuid;
  v_role app.company_roles%rowtype;
begin
  if p_company_id is null or p_role_key is null or p_role_name is null then
    return jsonb_build_object('ok', false, 'error', 'company_id, role_key, and role_name are required');
  end if;

  if not exists (select 1 from app.companies c where c.id = p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Company not found');
  end if;

  if exists (select 1 from app.company_roles r where r.tenant_id = p_company_id and r.role_key = p_role_key) then
    return jsonb_build_object('ok', false, 'error', 'Role key already exists for this company');
  end if;

  insert into app.company_roles (tenant_id, role_key, role_name, description, sort_order)
  values (p_company_id, p_role_key, p_role_name, p_description, p_sort_order)
  returning * into v_role;

  v_role_id := v_role.id;

  if v_role.role_key in ('owner', 'admin') then
    insert into app.company_role_permissions (role_id, permission_key, is_granted)
    select v_role_id, p.permission_key, true
    from app.permissions p
    on conflict (role_id, permission_key) do update
    set is_granted = excluded.is_granted, updated_at = now();
  elsif v_role.role_key = 'warehouse_manager' then
    insert into app.company_role_permissions (role_id, permission_key, is_granted)
    select v_role_id, p.permission_key, true
    from app.permissions p
    where p.permission_key in (
      'view_company','view_products','create_product','update_product','view_warehouses','create_warehouse','update_warehouse','manage_bins','view_grn','create_grn','update_grn','qc_grn','approve_grn','post_grn','view_stock','view_movements','transfer_stock','adjust_stock','approve_adjustment','reserve_stock','view_reports','export_reports','view_dashboard','submit_document','cancel_document','view_audit_history'
    )
    on conflict (role_id, permission_key) do update
    set is_granted = excluded.is_granted, updated_at = now();
  elsif v_role.role_key = 'stock_operator' then
    insert into app.company_role_permissions (role_id, permission_key, is_granted)
    select v_role_id, p.permission_key, true
    from app.permissions p
    where p.permission_key in (
      'view_company','view_products','view_warehouses','view_grn','create_grn','update_grn','view_stock','view_movements','transfer_stock','adjust_stock','reserve_stock','view_reports','view_dashboard','view_audit_history'
    )
    on conflict (role_id, permission_key) do update
    set is_granted = excluded.is_granted, updated_at = now();
  elsif v_role.role_key = 'viewer' then
    insert into app.company_role_permissions (role_id, permission_key, is_granted)
    select v_role_id, p.permission_key, true
    from app.permissions p
    where p.permission_key in (
      'view_company','view_products','view_warehouses','view_grn','view_stock','view_movements','view_reports','view_dashboard','view_audit_history'
    )
    on conflict (role_id, permission_key) do update
    set is_granted = excluded.is_granted, updated_at = now();
  elsif v_role.role_key = 'auditor' then
    insert into app.company_role_permissions (role_id, permission_key, is_granted)
    select v_role_id, p.permission_key, true
    from app.permissions p
    where p.permission_key in (
      'view_company','view_users','view_roles','view_products','view_warehouses','view_grn','view_stock','view_movements','view_reports','export_reports','view_dashboard','view_audit_history'
    )
    on conflict (role_id, permission_key) do update
    set is_granted = excluded.is_granted, updated_at = now();
  end if;

  return jsonb_build_object('ok', true, 'role_id', v_role_id);
end;
$$;
