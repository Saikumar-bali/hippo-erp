-- 0027_custom_doctype_wizard_hardening.sql
-- Phase 2.10: Custom DocType Wizard Hardening
-- Adds atomic bundle RPC, permission auto-provisioning, duplicate checks

-- ── 1. Transaction-safe bundle RPC ──────────────────────────────────────────

create or replace function public.erp_create_custom_doctype_bundle(
  p_doctype_key text,
  p_module_key text,
  p_label text,
  p_description text,
  p_route text,
  p_is_company_scoped boolean,
  p_fields jsonb,
  p_actions jsonb,
  p_workspace_key text,
  p_workspace_item_label text,
  p_company_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action jsonb;
  v_field jsonb;
  v_fieldname text;
  v_fieldtype text;
  v_is_required boolean;
  v_in_list_view boolean;
  v_in_standard_filter boolean;
  v_sort_order int;
  v_action_key text;
  v_permission_key text;
  v_list_view_cols jsonb;
  v_search_fields jsonb;
  v_first_col text;
  v_section_fields jsonb;
  v_read_perm text;
  v_role record;
  v_perm_count int;
  v_perm_inserted int := 0;
  v_grant_inserted int := 0;
begin
  -- Validate: generic_json only
  if p_fields is null or jsonb_array_length(p_fields) = 0 then
    return jsonb_build_object('ok', false, 'error', 'At least one field is required');
  end if;

  -- ── Duplicate checks ────────────────────────────────────────────────────

  if exists (select 1 from app.erp_doctypes where doctype_key = p_doctype_key) then
    return jsonb_build_object('ok', false, 'error', 'DocType key already exists: ' || p_doctype_key);
  end if;

  if exists (
    select 1 from app.erp_workspace_items
    where workspace_key = p_workspace_key and item_key = p_doctype_key
  ) then
    return jsonb_build_object('ok', false, 'error',
      'Workspace item key already exists in this workspace: ' || p_doctype_key);
  end if;

  -- ── 1. Insert DocType ───────────────────────────────────────────────────

  insert into app.erp_doctypes (
    doctype_key, module_key, label, description, route,
    schema_name, table_name, storage_strategy,
    is_company_scoped, is_submittable, is_child_table, is_single, is_active
  ) values (
    p_doctype_key, p_module_key, p_label, p_description, p_route,
    'app', 'erp_documents', 'generic_json',
    p_is_company_scoped, false, false, false, true
  );

  -- ── 2. Insert DocFields ─────────────────────────────────────────────────

  for v_field in select * from jsonb_array_elements(p_fields)
  loop
    v_fieldname := v_field->>'fieldname';
    v_fieldtype := v_field->>'fieldtype';
    v_is_required := coalesce((v_field->>'is_required')::boolean, false);
    v_in_list_view := coalesce((v_field->>'in_list_view')::boolean, false);
    v_in_standard_filter := coalesce((v_field->>'in_standard_filter')::boolean, false);
    v_sort_order := coalesce((v_field->>'sort_order')::int, 0);

    insert into app.erp_docfields (
      doctype_key, fieldname, label, fieldtype,
      is_required, in_list_view, in_standard_filter, sort_order,
      is_hidden, is_readonly, is_unique
    ) values (
      p_doctype_key, v_fieldname, v_field->>'label', v_fieldtype,
      v_is_required, v_in_list_view, v_in_standard_filter, v_sort_order,
      false, false, false
    );
  end loop;

  -- ── 3. Insert List View ─────────────────────────────────────────────────

  select jsonb_agg(jsonb_build_object('fieldname', f->>'fieldname', 'label', f->>'label'))
  into v_list_view_cols
  from jsonb_array_elements(p_fields) f
  where coalesce((f->>'in_list_view')::boolean, false) = true;

  select jsonb_agg(f->>'fieldname')
  into v_search_fields
  from jsonb_array_elements(p_fields) f
  where f->>'fieldtype' in ('Data', 'Text');

  select f->>'fieldname' into v_first_col
  from jsonb_array_elements(p_fields) f
  where coalesce((f->>'in_list_view')::boolean, false) = true
  order by coalesce((f->>'sort_order')::int, 0)
  limit 1;

  insert into app.erp_list_views (
    doctype_key, view_key, label,
    columns_json, search_fields_json, sort_json, is_default
  ) values (
    p_doctype_key, p_doctype_key || '_default', p_label || ' List',
    coalesce(v_list_view_cols, '[]'::jsonb),
    coalesce(v_search_fields, '[]'::jsonb),
    case when v_first_col is not null
      then jsonb_build_object('fieldname', v_first_col, 'direction', 'asc')
      else '{}'::jsonb
    end,
    true
  );

  -- ── 4. Insert Form Layout ───────────────────────────────────────────────

  select jsonb_agg(f->>'fieldname')
  into v_section_fields
  from jsonb_array_elements(p_fields) f;

  insert into app.erp_form_layouts (
    doctype_key, layout_key, label,
    sections_json, is_default
  ) values (
    p_doctype_key, p_doctype_key || '_default', p_label || ' Form',
    jsonb_build_array(jsonb_build_object(
      'section', 'Basic Info', 'columns', 1, 'fields', coalesce(v_section_fields, '[]'::jsonb)
    )),
    true
  );

  -- ── 5. Insert DocType Actions + provision permissions ───────────────────

  v_perm_inserted := 0;
  v_grant_inserted := 0;

  for v_action in select * from jsonb_array_elements(p_actions)
  loop
    v_action_key := v_action->>'action_key';
    v_permission_key := v_action->>'permission_key';

    insert into app.erp_doctype_actions (doctype_key, action_key, permission_key)
    values (p_doctype_key, v_action_key, v_permission_key);

    -- Create permission key in catalog if it doesn't exist
    if not exists (select 1 from app.permissions where permission_key = v_permission_key) then
      insert into app.permissions (
        permission_key, module_key, module_label, permission_label, description, sort_order
      ) values (
        v_permission_key,
        p_module_key,
        (select label from app.erp_modules where module_key = p_module_key),
        v_permission_key,
        'Auto-generated permission for custom DocType: ' || p_label,
        999
      );
      v_perm_inserted := v_perm_inserted + 1;
    end if;
  end loop;

  -- ── 6. Insert Workspace Item ────────────────────────────────────────────

  select a->>'permission_key' into v_read_perm
  from jsonb_array_elements(p_actions) a
  where a->>'action_key' = 'read'
  limit 1;

  insert into app.erp_workspace_items (
    workspace_key, item_key, label, item_type, target,
    required_permission_key, is_active
  ) values (
    p_workspace_key, p_doctype_key, p_workspace_item_label,
    'doctype', p_doctype_key,
    v_read_perm, true
  );

  -- ── 7. Grant permissions to owner and admin roles ───────────────────────

  for v_role in
    select cr.id, cr.role_key
    from app.company_roles cr
    where cr.tenant_id = p_company_id
      and cr.role_key in ('owner', 'admin')
      and cr.is_active = true
  loop
    for v_action in select * from jsonb_array_elements(p_actions)
    loop
      v_permission_key := v_action->>'permission_key';

      if not exists (
        select 1 from app.company_role_permissions
        where role_id = v_role.id and permission_key = v_permission_key
      ) then
        insert into app.company_role_permissions (role_id, permission_key, is_granted)
        values (v_role.id, v_permission_key, true);
        v_grant_inserted := v_grant_inserted + 1;
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'doctype_key', p_doctype_key,
    'label', p_label,
    'permissions_created', v_perm_inserted,
    'grants_added', v_grant_inserted
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'error', SQLERRM);
end;
$$;

grant execute on function public.erp_create_custom_doctype_bundle(text, text, text, text, text, boolean, jsonb, jsonb, text, text, uuid) to authenticated;
