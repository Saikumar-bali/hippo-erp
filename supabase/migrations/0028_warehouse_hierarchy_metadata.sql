-- 0028_warehouse_hierarchy_metadata.sql
-- Phase 3: Warehouse Hierarchy — metadata-driven DocTypes for 6-level location tree
-- All DocTypes use storage_strategy = generic_json (data stored in app.erp_documents)
-- Frappe-style metadata architecture on Supabase

-- ── 1. Enable Warehouse module and workspace ────────────────────────────────

update app.erp_modules
set is_active = true, updated_at = now()
where module_key = 'warehouse';

update app.erp_workspaces
set is_active = true, updated_at = now()
where workspace_key = 'warehouse';

-- ── 2. Seed DocTypes (generic_json) ─────────────────────────────────────────

insert into app.erp_doctypes (
  doctype_key, module_key, label, description, route,
  schema_name, table_name, storage_strategy,
  is_company_scoped, is_submittable, is_child_table, is_single, is_active
) values
  ('warehouse',        'warehouse', 'Warehouse',        'Top-level warehouse or storage location',             '/warehouse/warehouse',        'app', 'erp_documents', 'generic_json', true, false, false, false, true),
  ('warehouse_zone',   'warehouse', 'Warehouse Zone',   'Zone within a warehouse',                              '/warehouse/zone',             'app', 'erp_documents', 'generic_json', true, false, false, false, true),
  ('warehouse_aisle',  'warehouse', 'Warehouse Aisle',  'Aisle within a warehouse zone',                        '/warehouse/aisle',            'app', 'erp_documents', 'generic_json', true, false, false, false, true),
  ('warehouse_rack',   'warehouse', 'Warehouse Rack',   'Rack within a warehouse aisle',                        '/warehouse/rack',             'app', 'erp_documents', 'generic_json', true, false, false, false, true),
  ('warehouse_shelf',  'warehouse', 'Warehouse Shelf',  'Shelf within a warehouse rack',                        '/warehouse/shelf',            'app', 'erp_documents', 'generic_json', true, false, false, false, true),
  ('warehouse_bin',    'warehouse', 'Warehouse Bin',    'Individual bin location within a shelf',               '/warehouse/bin',              'app', 'erp_documents', 'generic_json', true, false, false, false, true)
on conflict (doctype_key) do nothing;

-- ── 3. Seed DocFields ────────────────────────────────────────────────────────

-- warehouse
insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, options, is_required, is_unique, is_readonly, is_hidden, in_list_view, in_standard_filter, sort_order)
values
  ('warehouse', 'warehouse_code', 'Warehouse Code', 'Data', '{}', true, false, false, false, true, true, 10),
  ('warehouse', 'warehouse_name', 'Warehouse Name', 'Data', '{}', true, false, false, false, true, false, 20),
  ('warehouse', 'address',        'Address',        'Text', '{}', false, false, false, false, false, false, 30),
  ('warehouse', 'is_active',      'Is Active',      'Check', '{}', false, false, false, false, true, false, 40)
on conflict (doctype_key, fieldname) do nothing;

-- warehouse_zone
insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, options, is_required, is_unique, is_readonly, is_hidden, in_list_view, in_standard_filter, sort_order)
values
  ('warehouse_zone', 'zone_code', 'Zone Code', 'Data', '{}', true, false, false, false, true, true, 10),
  ('warehouse_zone', 'zone_name', 'Zone Name', 'Data', '{}', true, false, false, false, true, false, 20),
  ('warehouse_zone', 'warehouse', 'Warehouse', 'Link', '{"link_to": "warehouse", "display_field": "warehouse_name"}', true, false, false, false, true, true, 30),
  ('warehouse_zone', 'is_active', 'Is Active', 'Check', '{}', false, false, false, false, true, false, 40)
on conflict (doctype_key, fieldname) do nothing;

-- warehouse_aisle
insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, options, is_required, is_unique, is_readonly, is_hidden, in_list_view, in_standard_filter, sort_order)
values
  ('warehouse_aisle', 'aisle_code', 'Aisle Code', 'Data', '{}', true, false, false, false, true, true, 10),
  ('warehouse_aisle', 'aisle_name', 'Aisle Name', 'Data', '{}', true, false, false, false, true, false, 20),
  ('warehouse_aisle', 'warehouse_zone', 'Warehouse Zone', 'Link', '{"link_to": "warehouse_zone", "display_field": "zone_name"}', true, false, false, false, true, true, 30),
  ('warehouse_aisle', 'is_active',     'Is Active',       'Check', '{}', false, false, false, false, true, false, 40)
on conflict (doctype_key, fieldname) do nothing;

-- warehouse_rack
insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, options, is_required, is_unique, is_readonly, is_hidden, in_list_view, in_standard_filter, sort_order)
values
  ('warehouse_rack', 'rack_code', 'Rack Code', 'Data', '{}', true, false, false, false, true, true, 10),
  ('warehouse_rack', 'rack_name', 'Rack Name', 'Data', '{}', true, false, false, false, true, false, 20),
  ('warehouse_rack', 'warehouse_aisle', 'Warehouse Aisle', 'Link', '{"link_to": "warehouse_aisle", "display_field": "aisle_name"}', true, false, false, false, true, true, 30),
  ('warehouse_rack', 'is_active',       'Is Active',       'Check', '{}', false, false, false, false, true, false, 40)
on conflict (doctype_key, fieldname) do nothing;

-- warehouse_shelf
insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, options, is_required, is_unique, is_readonly, is_hidden, in_list_view, in_standard_filter, sort_order)
values
  ('warehouse_shelf', 'shelf_code', 'Shelf Code', 'Data', '{}', true, false, false, false, true, true, 10),
  ('warehouse_shelf', 'shelf_name', 'Shelf Name', 'Data', '{}', true, false, false, false, true, false, 20),
  ('warehouse_shelf', 'warehouse_rack', 'Warehouse Rack', 'Link', '{"link_to": "warehouse_rack", "display_field": "rack_name"}', true, false, false, false, true, true, 30),
  ('warehouse_shelf', 'is_active',      'Is Active',      'Check', '{}', false, false, false, false, true, false, 40)
on conflict (doctype_key, fieldname) do nothing;

-- warehouse_bin
insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, options, is_required, is_unique, is_readonly, is_hidden, in_list_view, in_standard_filter, sort_order)
values
  ('warehouse_bin', 'bin_code', 'Bin Code', 'Data', '{}', true, false, false, false, true, true, 10),
  ('warehouse_bin', 'bin_name', 'Bin Name', 'Data', '{}', true, false, false, false, true, false, 20),
  ('warehouse_bin', 'warehouse_shelf', 'Warehouse Shelf', 'Link', '{"link_to": "warehouse_shelf", "display_field": "shelf_name"}', true, false, false, false, true, true, 30),
  ('warehouse_bin', 'capacity',        'Capacity',        'Float', '{}', false, false, false, false, true, false, 40),
  ('warehouse_bin', 'is_active',       'Is Active',       'Check', '{}', false, false, false, false, true, false, 50)
on conflict (doctype_key, fieldname) do nothing;

-- ── 4. Seed List Views ───────────────────────────────────────────────────────

insert into app.erp_list_views (doctype_key, view_key, label, columns_json, search_fields_json, sort_json, is_default) values
  ('warehouse',       'warehouse_default',       'Warehouse List',
   '[{"fieldname":"warehouse_code","label":"Warehouse Code"},{"fieldname":"warehouse_name","label":"Warehouse Name"},{"fieldname":"is_active","label":"Is Active"}]'::jsonb,
   '["warehouse_code","warehouse_name","address"]'::jsonb,
   '{"fieldname":"warehouse_code","direction":"asc"}'::jsonb, true),
  ('warehouse_zone',  'warehouse_zone_default',  'Warehouse Zone List',
   '[{"fieldname":"zone_code","label":"Zone Code"},{"fieldname":"zone_name","label":"Zone Name"},{"fieldname":"warehouse","label":"Warehouse"},{"fieldname":"is_active","label":"Is Active"}]'::jsonb,
   '["zone_code","zone_name"]'::jsonb,
   '{"fieldname":"zone_code","direction":"asc"}'::jsonb, true),
  ('warehouse_aisle', 'warehouse_aisle_default', 'Warehouse Aisle List',
   '[{"fieldname":"aisle_code","label":"Aisle Code"},{"fieldname":"aisle_name","label":"Aisle Name"},{"fieldname":"warehouse_zone","label":"Warehouse Zone"},{"fieldname":"is_active","label":"Is Active"}]'::jsonb,
   '["aisle_code","aisle_name"]'::jsonb,
   '{"fieldname":"aisle_code","direction":"asc"}'::jsonb, true),
  ('warehouse_rack',  'warehouse_rack_default',  'Warehouse Rack List',
   '[{"fieldname":"rack_code","label":"Rack Code"},{"fieldname":"rack_name","label":"Rack Name"},{"fieldname":"warehouse_aisle","label":"Warehouse Aisle"},{"fieldname":"is_active","label":"Is Active"}]'::jsonb,
   '["rack_code","rack_name"]'::jsonb,
   '{"fieldname":"rack_code","direction":"asc"}'::jsonb, true),
  ('warehouse_shelf', 'warehouse_shelf_default', 'Warehouse Shelf List',
   '[{"fieldname":"shelf_code","label":"Shelf Code"},{"fieldname":"shelf_name","label":"Shelf Name"},{"fieldname":"warehouse_rack","label":"Warehouse Rack"},{"fieldname":"is_active","label":"Is Active"}]'::jsonb,
   '["shelf_code","shelf_name"]'::jsonb,
   '{"fieldname":"shelf_code","direction":"asc"}'::jsonb, true),
  ('warehouse_bin',   'warehouse_bin_default',   'Warehouse Bin List',
   '[{"fieldname":"bin_code","label":"Bin Code"},{"fieldname":"bin_name","label":"Bin Name"},{"fieldname":"warehouse_shelf","label":"Warehouse Shelf"},{"fieldname":"capacity","label":"Capacity"},{"fieldname":"is_active","label":"Is Active"}]'::jsonb,
   '["bin_code","bin_name"]'::jsonb,
   '{"fieldname":"bin_code","direction":"asc"}'::jsonb, true)
on conflict (doctype_key, view_key) do nothing;

-- ── 5. Seed Form Layouts ─────────────────────────────────────────────────────

insert into app.erp_form_layouts (doctype_key, layout_key, label, sections_json, is_default) values
  ('warehouse',       'warehouse_default',       'Warehouse Form',
   '[{"section":"Basic Info","columns":1,"fields":["warehouse_code","warehouse_name","address","is_active"]}]'::jsonb, true),
  ('warehouse_zone',  'warehouse_zone_default',  'Warehouse Zone Form',
   '[{"section":"Basic Info","columns":1,"fields":["zone_code","zone_name","warehouse","is_active"]}]'::jsonb, true),
  ('warehouse_aisle', 'warehouse_aisle_default', 'Warehouse Aisle Form',
   '[{"section":"Basic Info","columns":1,"fields":["aisle_code","aisle_name","warehouse_zone","is_active"]}]'::jsonb, true),
  ('warehouse_rack',  'warehouse_rack_default',  'Warehouse Rack Form',
   '[{"section":"Basic Info","columns":1,"fields":["rack_code","rack_name","warehouse_aisle","is_active"]}]'::jsonb, true),
  ('warehouse_shelf', 'warehouse_shelf_default', 'Warehouse Shelf Form',
   '[{"section":"Basic Info","columns":1,"fields":["shelf_code","shelf_name","warehouse_rack","is_active"]}]'::jsonb, true),
  ('warehouse_bin',   'warehouse_bin_default',   'Warehouse Bin Form',
   '[{"section":"Basic Info","columns":1,"fields":["bin_code","bin_name","warehouse_shelf","capacity","is_active"]}]'::jsonb, true)
on conflict (doctype_key, layout_key) do nothing;

-- ── 6. Seed DocType Actions ──────────────────────────────────────────────────

insert into app.erp_doctype_actions (doctype_key, action_key, permission_key) values
  ('warehouse',       'read',       'view_warehouse'),
  ('warehouse',       'create',     'create_warehouse'),
  ('warehouse',       'update',     'update_warehouse'),
  ('warehouse',       'deactivate', 'delete_warehouse'),
  ('warehouse_zone',  'read',       'view_warehouse_zone'),
  ('warehouse_zone',  'create',     'create_warehouse_zone'),
  ('warehouse_zone',  'update',     'update_warehouse_zone'),
  ('warehouse_zone',  'deactivate', 'delete_warehouse_zone'),
  ('warehouse_aisle', 'read',       'view_warehouse_aisle'),
  ('warehouse_aisle', 'create',     'create_warehouse_aisle'),
  ('warehouse_aisle', 'update',     'update_warehouse_aisle'),
  ('warehouse_aisle', 'deactivate', 'delete_warehouse_aisle'),
  ('warehouse_rack',  'read',       'view_warehouse_rack'),
  ('warehouse_rack',  'create',     'create_warehouse_rack'),
  ('warehouse_rack',  'update',     'update_warehouse_rack'),
  ('warehouse_rack',  'deactivate', 'delete_warehouse_rack'),
  ('warehouse_shelf', 'read',       'view_warehouse_shelf'),
  ('warehouse_shelf', 'create',     'create_warehouse_shelf'),
  ('warehouse_shelf', 'update',     'update_warehouse_shelf'),
  ('warehouse_shelf', 'deactivate', 'delete_warehouse_shelf'),
  ('warehouse_bin',   'read',       'view_warehouse_bin'),
  ('warehouse_bin',   'create',     'create_warehouse_bin'),
  ('warehouse_bin',   'update',     'update_warehouse_bin'),
  ('warehouse_bin',   'deactivate', 'delete_warehouse_bin')
on conflict (doctype_key, action_key) do nothing;

-- ── 7. Seed/Update Workspace Items under warehouse workspace ─────────────────

-- Remove old items that referenced legacy doctypes
delete from app.erp_workspace_items
where workspace_key = 'warehouse'
  and item_key in ('warehouses', 'zones');

-- Insert new workspace items for the 6 hierarchy DocTypes
insert into app.erp_workspace_items (workspace_key, item_key, label, item_type, target, sort_order, is_active, required_permission_key)
values
  ('warehouse', 'warehouse',       'Warehouses',       'doctype', 'warehouse',       10, true, 'view_warehouse'),
  ('warehouse', 'warehouse_zone',  'Zones',            'doctype', 'warehouse_zone',  20, true, 'view_warehouse_zone'),
  ('warehouse', 'warehouse_aisle', 'Aisles',           'doctype', 'warehouse_aisle', 30, true, 'view_warehouse_aisle'),
  ('warehouse', 'warehouse_rack',  'Racks',            'doctype', 'warehouse_rack',  40, true, 'view_warehouse_rack'),
  ('warehouse', 'warehouse_shelf', 'Shelves',          'doctype', 'warehouse_shelf', 50, true, 'view_warehouse_shelf'),
  ('warehouse', 'warehouse_bin',   'Bins',             'doctype', 'warehouse_bin',   60, true, 'view_warehouse_bin')
on conflict (workspace_key, item_key) do nothing;

-- ── 8. Seed Permission Keys (if not already in catalog) ──────────────────────

insert into app.permissions (permission_key, module_key, module_label, permission_label, description, sort_order)
values
  ('view_warehouse',       'warehouse', 'Warehouse', 'view_warehouse',       'View warehouse hierarchy — top-level locations.', 999),
  ('create_warehouse',     'warehouse', 'Warehouse', 'create_warehouse',     'Create a warehouse or storage location.', 999),
  ('update_warehouse',     'warehouse', 'Warehouse', 'update_warehouse',     'Update a warehouse or storage location.', 999),
  ('delete_warehouse',     'warehouse', 'Warehouse', 'delete_warehouse',     'Deactivate a warehouse or storage location.', 999),
  ('view_warehouse_zone',  'warehouse', 'Warehouse', 'view_warehouse_zone',  'View warehouse zones.', 999),
  ('create_warehouse_zone','warehouse', 'Warehouse', 'create_warehouse_zone','Create a warehouse zone.', 999),
  ('update_warehouse_zone','warehouse', 'Warehouse', 'update_warehouse_zone','Update a warehouse zone.', 999),
  ('delete_warehouse_zone','warehouse', 'Warehouse', 'delete_warehouse_zone','Deactivate a warehouse zone.', 999),
  ('view_warehouse_aisle', 'warehouse', 'Warehouse', 'view_warehouse_aisle', 'View warehouse aisles.', 999),
  ('create_warehouse_aisle','warehouse','Warehouse', 'create_warehouse_aisle','Create a warehouse aisle.', 999),
  ('update_warehouse_aisle','warehouse','Warehouse', 'update_warehouse_aisle','Update a warehouse aisle.', 999),
  ('delete_warehouse_aisle','warehouse','Warehouse', 'delete_warehouse_aisle','Deactivate a warehouse aisle.', 999),
  ('view_warehouse_rack',  'warehouse', 'Warehouse', 'view_warehouse_rack',  'View warehouse racks.', 999),
  ('create_warehouse_rack','warehouse', 'Warehouse', 'create_warehouse_rack','Create a warehouse rack.', 999),
  ('update_warehouse_rack','warehouse', 'Warehouse', 'update_warehouse_rack','Update a warehouse rack.', 999),
  ('delete_warehouse_rack','warehouse', 'Warehouse', 'delete_warehouse_rack','Deactivate a warehouse rack.', 999),
  ('view_warehouse_shelf', 'warehouse', 'Warehouse', 'view_warehouse_shelf', 'View warehouse shelves.', 999),
  ('create_warehouse_shelf','warehouse','Warehouse', 'create_warehouse_shelf','Create a warehouse shelf.', 999),
  ('update_warehouse_shelf','warehouse','Warehouse', 'update_warehouse_shelf','Update a warehouse shelf.', 999),
  ('delete_warehouse_shelf','warehouse','Warehouse', 'delete_warehouse_shelf','Deactivate a warehouse shelf.', 999),
  ('view_warehouse_bin',   'warehouse', 'Warehouse', 'view_warehouse_bin',   'View warehouse bins.', 999),
  ('create_warehouse_bin', 'warehouse', 'Warehouse', 'create_warehouse_bin', 'Create a warehouse bin.', 999),
  ('update_warehouse_bin', 'warehouse', 'Warehouse', 'update_warehouse_bin', 'Update a warehouse bin.', 999),
  ('delete_warehouse_bin', 'warehouse', 'Warehouse', 'delete_warehouse_bin', 'Deactivate a warehouse bin.', 999)
on conflict (permission_key) do nothing;

-- ── 9. Grant Permissions to Owner and Admin Roles ────────────────────────────

do $$
declare
  v_company record;
  v_role record;
  v_perm_key text;
  v_perm_keys text[] := array[
    'view_warehouse', 'create_warehouse', 'update_warehouse', 'delete_warehouse',
    'view_warehouse_zone', 'create_warehouse_zone', 'update_warehouse_zone', 'delete_warehouse_zone',
    'view_warehouse_aisle', 'create_warehouse_aisle', 'update_warehouse_aisle', 'delete_warehouse_aisle',
    'view_warehouse_rack', 'create_warehouse_rack', 'update_warehouse_rack', 'delete_warehouse_rack',
    'view_warehouse_shelf', 'create_warehouse_shelf', 'update_warehouse_shelf', 'delete_warehouse_shelf',
    'view_warehouse_bin', 'create_warehouse_bin', 'update_warehouse_bin', 'delete_warehouse_bin'
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
  end loop;
end;
$$;
