-- 0031_grn_permissions_workspace.sql
-- Phase 4.1: Seed GRN + inventory permissions and activate Purchasing workspace

-- ── 1. Add new permission keys to catalog (delete_grn, view_inventory_movements, view_current_inventory) ──
-- (view_grn, create_grn, update_grn, post_grn already exist from 0007)

insert into app.permissions (
  permission_key, module_key, module_label, permission_label, description, sort_order
) values
  ('delete_grn',              'grn',        'GRN',       'Delete GRN',              'Delete a draft GRN document.', 25),
  ('view_inventory_movements', 'inventory', 'Inventory', 'View Inventory Movements', 'View the inventory movement ledger.', 21),
  ('view_current_inventory',  'inventory', 'Inventory', 'View Current Inventory',   'View current on-hand and available quantities.', 11)
on conflict (permission_key) do update
set
  module_key = excluded.module_key,
  module_label = excluded.module_label,
  permission_label = excluded.permission_label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- ── 2. Activate Purchasing workspace ──────────────────────────────────────────

update app.erp_workspaces
set is_active = true, updated_at = now()
where workspace_key = 'purchasing';

-- ── 3. Update GRN workspace item to active ────────────────────────────────────
-- (Already seeded as inactive in 0021; activate it)

update app.erp_workspace_items
set is_active = true, updated_at = now()
where workspace_key = 'purchasing' and item_key = 'grn';

-- ── 4. Add inactive inventory movements/current_inventory workspace items ─────

insert into app.erp_workspace_items (workspace_key, item_key, label, item_type, target, sort_order, is_active, required_permission_key, icon)
values
  ('inventory', 'movements',        'Movements Ledger', 'page', '/inventory/movements',        20, false, 'view_inventory_movements', 'DatabaseZap'),
  ('inventory', 'current_inventory', 'Current Stock',   'page', '/inventory/current-inventory', 10, false, 'view_current_inventory',  'Boxes')
on conflict (workspace_key, item_key) do update
set
  label = excluded.label,
  item_type = excluded.item_type,
  target = excluded.target,
  sort_order = excluded.sort_order,
  required_permission_key = excluded.required_permission_key,
  icon = excluded.icon,
  updated_at = now();

-- ── 5. Grant new permissions to owner and admin via system role grants ────────

insert into app.role_permission_grants (role, permission_key, is_granted)
select r.role, p.permission_key, true
from (values
  ('owner'::app.role_type, true),
  ('admin'::app.role_type, true)
) as r(role, grant_all)
cross join (values
  ('delete_grn'::text),
  ('view_inventory_movements'::text),
  ('view_current_inventory'::text)
) as p(permission_key)
where r.grant_all
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

-- ── 6. Grant new permissions to warehouse_manager ──────────────────────────────

insert into app.role_permission_grants (role, permission_key, is_granted)
select 'warehouse_manager'::app.role_type, p.permission_key, true
from (values
  ('delete_grn'::text),
  ('view_inventory_movements'::text),
  ('view_current_inventory'::text)
) as p(permission_key)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

-- ── 7. Grant view_* to viewer and auditor ─────────────────────────────────────

insert into app.role_permission_grants (role, permission_key, is_granted)
select 'viewer'::app.role_type, p.permission_key, true
from (values
  ('view_inventory_movements'::text),
  ('view_current_inventory'::text)
) as p(permission_key)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

insert into app.role_permission_grants (role, permission_key, is_granted)
select 'auditor'::app.role_type, p.permission_key, true
from (values
  ('view_inventory_movements'::text),
  ('view_current_inventory'::text)
) as p(permission_key)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

-- ── 8. Grant new permissions to existing company roles for all companies ────────

do $$
declare
  v_company record;
  v_role record;
  v_perm_key text;
  v_perm_keys text[] := array[
    'delete_grn',
    'view_inventory_movements',
    'view_current_inventory'
  ];
begin
  for v_company in select id from app.tenants loop
    for v_role in
      select cr.id, cr.role_key
      from app.company_roles cr
      where cr.tenant_id = v_company.id
        and cr.role_key in ('owner', 'admin')
        and cr.is_active = true
    loop
      foreach v_perm_key in array v_perm_keys loop
        if not exists (
          select 1 from app.company_role_permissions
          where role_id = v_role.id and permission_key = v_perm_key
        ) then
          insert into app.company_role_permissions (role_id, permission_key, is_granted)
          values (v_role.id, v_perm_key, true);
        end if;
      end loop;
    end loop;

    for v_role in
      select cr.id, cr.role_key
      from app.company_roles cr
      where cr.tenant_id = v_company.id
        and cr.role_key in ('warehouse_manager')
        and cr.is_active = true
    loop
      foreach v_perm_key in array v_perm_keys loop
        if not exists (
          select 1 from app.company_role_permissions
          where role_id = v_role.id and permission_key = v_perm_key
        ) then
          insert into app.company_role_permissions (role_id, permission_key, is_granted)
          values (v_role.id, v_perm_key, true);
        end if;
      end loop;
    end loop;

    for v_role in
      select cr.id, cr.role_key
      from app.company_roles cr
      where cr.tenant_id = v_company.id
        and cr.role_key in ('viewer', 'auditor')
        and cr.is_active = true
    loop
      foreach v_perm_key in array array['view_inventory_movements', 'view_current_inventory'] loop
        if not exists (
          select 1 from app.company_role_permissions
          where role_id = v_role.id and permission_key = v_perm_key
        ) then
          insert into app.company_role_permissions (role_id, permission_key, is_granted)
          values (v_role.id, v_perm_key, true);
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;

-- ── 9. Grant stock_operator delete_grn ─────────────────────────────────────────

do $$
declare
  v_company record;
  v_role record;
begin
  for v_company in select id from app.tenants loop
    for v_role in
      select cr.id
      from app.company_roles cr
      where cr.tenant_id = v_company.id
        and cr.role_key = 'stock_operator'
        and cr.is_active = true
    loop
      if not exists (
        select 1 from app.company_role_permissions
        where role_id = v_role.id and permission_key = 'delete_grn'
      ) then
        insert into app.company_role_permissions (role_id, permission_key, is_granted)
        values (v_role.id, 'delete_grn', true);
      end if;
    end loop;
  end loop;
end;
$$;
