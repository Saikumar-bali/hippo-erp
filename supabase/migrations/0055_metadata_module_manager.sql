-- 0055_metadata_module_manager.sql
-- Phase 6.8.5: Metadata Studio Module Manager Repair
--
-- 1. Seed granular module management permissions
-- 2. Create RPCs for safe module management
-- 3. Grant execute to authenticated
--
-- This is NOT the future full Module Builder/App Builder.
-- This is a focused app.erp_modules manager required by DocType creation.
-- Phase 6.9 was not started.

-- ── 1. Module management permissions ─────────────────────────────────────────

insert into app.permissions (permission_key, module_key, module_label, permission_label, description, sort_order)
values
  ('view_metadata_modules',   'developer', 'Developer', 'View Metadata Modules',   'View the list of ERP modules used in DocType Builder.',      11),
  ('create_metadata_module',  'developer', 'Developer', 'Create Metadata Module',  'Create new ERP module records.',                             12),
  ('update_metadata_module',  'developer', 'Developer', 'Update Metadata Module',  'Edit existing ERP module labels, descriptions, and sort order.', 13),
  ('delete_metadata_module',  'developer', 'Developer', 'Delete Metadata Module',  'Delete unused ERP modules (blocked if referenced by DocTypes).', 14)
on conflict (permission_key) do update
set
  module_key       = excluded.module_key,
  module_label     = excluded.module_label,
  permission_label = excluded.permission_label,
  description      = excluded.description,
  sort_order       = excluded.sort_order,
  is_active        = true,
  updated_at       = now();

-- Grant module management permissions to owner and admin system roles
insert into app.role_permission_grants (role, permission_key, is_granted)
values
  ('owner'::app.role_type, 'view_metadata_modules',   true),
  ('admin'::app.role_type, 'view_metadata_modules',   true),
  ('owner'::app.role_type, 'create_metadata_module',  true),
  ('admin'::app.role_type, 'create_metadata_module',  true),
  ('owner'::app.role_type, 'update_metadata_module',  true),
  ('admin'::app.role_type, 'update_metadata_module',  true),
  ('owner'::app.role_type, 'delete_metadata_module',  true),
  ('admin'::app.role_type, 'delete_metadata_module',  true)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

-- Also add to create_company_role owner/admin auto-grant
-- (the function selects all permissions, so new ones are auto-included)

-- ── 2. Helper: check if a module is referenced by any DocType ────────────────

create or replace function public.erp_module_has_doctypes(p_module_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.erp_doctypes d
  where d.module_key = p_module_key
    and d.is_active = true;

  return jsonb_build_object(
    'ok', true,
    'has_doctypes', v_count > 0,
    'doctype_count', v_count
  );
end;
$$;

-- ── 3. List all modules (with doctype reference counts) ──────────────────────

create or replace function public.erp_list_modules()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not app.current_user_has_manage_metadata() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_metadata required');
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'module_key', m.module_key,
      'label', m.label,
      'description', m.description,
      'icon', m.icon,
      'route', m.route,
      'sort_order', m.sort_order,
      'is_active', m.is_active,
      'doctype_count', (select count(*) from app.erp_doctypes d where d.module_key = m.module_key and d.is_active = true)
    ) order by m.sort_order asc
  ) into v_result
  from app.erp_modules m;

  return jsonb_build_object('ok', true, 'data', coalesce(v_result, '[]'::jsonb));
end;
$$;

-- ── 4. Create module ─────────────────────────────────────────────────────────

create or replace function public.erp_create_module(
  p_module_key text,
  p_label text,
  p_description text default null,
  p_icon text default null,
  p_route text default null,
  p_sort_order int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result app.erp_modules%rowtype;
begin
  if not app.current_user_has_manage_metadata() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_metadata required');
  end if;

  if p_module_key is null or p_label is null then
    return jsonb_build_object('ok', false, 'error', 'module_key and label are required');
  end if;

  if exists (select 1 from app.erp_modules where module_key = p_module_key) then
    return jsonb_build_object('ok', false, 'error', 'Module key already exists');
  end if;

  insert into app.erp_modules (module_key, label, description, icon, route, sort_order, is_active)
  values (p_module_key, p_label, p_description, p_icon, p_route, p_sort_order, true)
  returning * into v_result;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'id', v_result.id,
      'module_key', v_result.module_key,
      'label', v_result.label,
      'description', v_result.description,
      'icon', v_result.icon,
      'route', v_result.route,
      'sort_order', v_result.sort_order,
      'is_active', v_result.is_active
    )
  );
end;
$$;

-- ── 5. Update module ─────────────────────────────────────────────────────────

create or replace function public.erp_update_module(
  p_id uuid,
  p_label text default null,
  p_description text default null,
  p_icon text default null,
  p_route text default null,
  p_sort_order int default null,
  p_is_active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result app.erp_modules%rowtype;
begin
  if not app.current_user_has_manage_metadata() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_metadata required');
  end if;

  update app.erp_modules m
  set
    label       = coalesce(p_label, m.label),
    description = case when p_description is not null then p_description else m.description end,
    icon        = case when p_icon is not null then p_icon else m.icon end,
    route       = case when p_route is not null then p_route else m.route end,
    sort_order  = coalesce(p_sort_order, m.sort_order),
    is_active   = coalesce(p_is_active, m.is_active),
    updated_at  = now()
  where m.id = p_id
  returning * into v_result;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Module not found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'id', v_result.id,
      'module_key', v_result.module_key,
      'label', v_result.label,
      'description', v_result.description,
      'icon', v_result.icon,
      'route', v_result.route,
      'sort_order', v_result.sort_order,
      'is_active', v_result.is_active
    )
  );
end;
$$;

-- ── 6. Deactivate module (safe soft-delete) ──────────────────────────────────

create or replace function public.erp_deactivate_module(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module app.erp_modules%rowtype;
begin
  if not app.current_user_has_manage_metadata() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_metadata required');
  end if;

  select * into v_module from app.erp_modules where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Module not found');
  end if;

  update app.erp_modules set is_active = false, updated_at = now() where id = p_id;

  return jsonb_build_object('ok', true, 'module_key', v_module.module_key, 'is_active', false);
end;
$$;

-- ── 7. Reactivate module ─────────────────────────────────────────────────────

create or replace function public.erp_reactivate_module(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module app.erp_modules%rowtype;
begin
  if not app.current_user_has_manage_metadata() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_metadata required');
  end if;

  select * into v_module from app.erp_modules where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Module not found');
  end if;

  update app.erp_modules set is_active = true, updated_at = now() where id = p_id;

  return jsonb_build_object('ok', true, 'module_key', v_module.module_key, 'is_active', true);
end;
$$;

-- ── 8. Delete module (only if no active DocTypes reference it) ───────────────

create or replace function public.erp_delete_module_if_unused(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_module app.erp_modules%rowtype;
  v_count int;
begin
  if not app.current_user_has_manage_metadata() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_metadata required');
  end if;

  select * into v_module from app.erp_modules where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Module not found');
  end if;

  select count(*) into v_count
  from app.erp_doctypes d
  where d.module_key = v_module.module_key
    and d.is_active = true;

  if v_count > 0 then
    return jsonb_build_object(
      'ok', false,
      'error', 'Cannot delete module: referenced by ' || v_count || ' active DocType(s). Deactivate instead.',
      'doctype_count', v_count
    );
  end if;

  delete from app.erp_modules where id = p_id;

  return jsonb_build_object('ok', true, 'module_key', v_module.module_key, 'deleted', true);
end;
$$;

-- ── 9. Grant execute to authenticated ────────────────────────────────────────

-- Note: app.current_user_has_manage_metadata() is used for permission checks
-- We grant EXECUTE (already done for other RPCs in prior migrations).
-- The functions are SECURITY DEFINER, so the permission check happens inside.

grant execute on function public.erp_module_has_doctypes(p_module_key text)               to authenticated;
grant execute on function public.erp_list_modules()                                        to authenticated;
grant execute on function public.erp_create_module(p_module_key text, p_label text, p_description text, p_icon text, p_route text, p_sort_order int) to authenticated;
grant execute on function public.erp_update_module(p_id uuid, p_label text, p_description text, p_icon text, p_route text, p_sort_order int, p_is_active boolean) to authenticated;
grant execute on function public.erp_deactivate_module(p_id uuid)                          to authenticated;
grant execute on function public.erp_reactivate_module(p_id uuid)                          to authenticated;
grant execute on function public.erp_delete_module_if_unused(p_id uuid)                    to authenticated;
