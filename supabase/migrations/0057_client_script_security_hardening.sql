-- 0057_client_script_security_hardening.sql
-- Phase 6.9.1: Client Script Security and Verification Gate
--
-- 1. Add server-side script_body validation function
-- 2. Harden erp_get_client_scripts_for_doctype — check DocType read permission
-- 3. Harden erp_create_client_script — validate script_body server-side
-- 4. Harden erp_update_client_script — validate script_body server-side
-- 5. Harden RLS policies — check DocType read access for script loading
-- 6. Drop demo script seeded without company_id (re-seed with proper validation)

-- ── 1. Validation constants (as function for reuse) ────────────────────────────

create or replace function public.validate_client_script_body(p_body jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_rules jsonb;
  v_rule jsonb;
  v_when jsonb;
  v_when_operator text;
  v_action jsonb;
  v_action_type text;
  v_action_field text;
  v_rules_arr jsonb;
  v_suspicious text[];
begin
  -- Must be a JSON object
  if jsonb_typeof(p_body) != 'object' then
    return jsonb_build_object('ok', false, 'error', 'script_body must be a JSON object');
  end if;

  v_rules := p_body -> 'rules';

  -- rules must exist and be an array
  if v_rules is null or jsonb_typeof(v_rules) != 'array' then
    return jsonb_build_object('ok', false, 'error', 'script_body.rules must be a JSON array');
  end if;

  v_rules_arr := v_rules;

  -- Check for suspicious keys at root level
  v_suspicious := array(
    select key from jsonb_object_keys(p_body) as key
    where key in ('code', 'javascript', 'eval', 'functionBody', 'source')
  );
  if array_length(v_suspicious, 1) > 0 then
    return jsonb_build_object('ok', false, 'error',
      'Suspicious keys found in script_body: ' || array_to_string(v_suspicious, ', '));
  end if;

  -- Validate each rule
  for i in 0 .. jsonb_array_length(v_rules_arr) - 1 loop
    v_rule := v_rules_arr -> i;

    if jsonb_typeof(v_rule) != 'object' then
      return jsonb_build_object('ok', false, 'error', 'Each rule must be a JSON object');
    end if;

    -- Check for suspicious keys in rule
    v_suspicious := array(
      select key from jsonb_object_keys(v_rule) as key
      where key in ('code', 'javascript', 'eval', 'functionBody', 'source')
    );
    if array_length(v_suspicious, 1) > 0 then
      return jsonb_build_object('ok', false, 'error',
        'Suspicious keys found in rule: ' || array_to_string(v_suspicious, ', '));
    end if;

    -- Validate when clause
    v_when := v_rule -> 'when';
    if v_when is not null and jsonb_typeof(v_when) = 'object' then
      v_when_operator := v_when ->> 'operator';

      if v_when_operator is not null then
        if v_when_operator not in ('equals', 'not_equals', 'in', 'not_in', 'is_set', 'is_not_set') then
          return jsonb_build_object('ok', false, 'error',
            'Invalid operator: ' || v_when_operator || '. Allowed: equals, not_equals, in, not_in, is_set, is_not_set');
        end if;
      end if;

      -- Check for suspicious keys in when
      v_suspicious := array(
        select key from jsonb_object_keys(v_when) as key
        where key in ('code', 'javascript', 'eval', 'functionBody', 'source')
      );
      if array_length(v_suspicious, 1) > 0 then
        return jsonb_build_object('ok', false, 'error',
          'Suspicious keys found in when clause: ' || array_to_string(v_suspicious, ', '));
      end if;
    end if;

    -- Validate actions
    declare
      v_actions jsonb;
    begin
      v_actions := v_rule -> 'actions';
      if v_actions is null or jsonb_typeof(v_actions) != 'array' then
        return jsonb_build_object('ok', false, 'error', 'Each rule must have an actions array');
      end if;

      for j in 0 .. jsonb_array_length(v_actions) - 1 loop
        v_action := v_actions -> j;

        if jsonb_typeof(v_action) != 'object' then
          return jsonb_build_object('ok', false, 'error', 'Each action must be a JSON object');
        end if;

        v_action_type := v_action ->> 'type';
        if v_action_type is null then
          return jsonb_build_object('ok', false, 'error', 'Each action must have a type');
        end if;

        -- Validate action type
        if v_action_type not in ('setValue', 'setRequired', 'setReadOnly', 'setVisible', 'showMessage', 'validateRequired', 'computeTemplateValue') then
          return jsonb_build_object('ok', false, 'error',
            'Invalid action type: ' || v_action_type || '. Allowed: setValue, setRequired, setReadOnly, setVisible, showMessage, validateRequired, computeTemplateValue');
        end if;

        -- Validate field is not blocked
        v_action_field := v_action ->> 'field';
        if v_action_field is not null then
          if v_action_field in ('docstatus', 'workflow_state', 'created_by', 'created_at', 'updated_at', 'company_id', 'tenant_id') then
            return jsonb_build_object('ok', false, 'error',
              'Cannot target blocked field: ' || v_action_field);
          end if;
        end if;

        -- Check for suspicious keys in action
        v_suspicious := array(
          select key from jsonb_object_keys(v_action) as key
          where key in ('code', 'javascript', 'eval', 'functionBody', 'source')
        );
        if array_length(v_suspicious, 1) > 0 then
          return jsonb_build_object('ok', false, 'error',
            'Suspicious keys found in action: ' || array_to_string(v_suspicious, ', '));
        end if;
      end loop;
    end;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.validate_client_script_body(p_body jsonb) to authenticated;

-- ── 2. Harden: Get scripts for doctype — requires doctype read permission ───────

create or replace function public.erp_get_client_scripts_for_doctype(
  p_doctype_key text,
  p_company_id  uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_result jsonb;
begin
  v_company_id := coalesce(p_company_id, app.current_company_id());

  -- Check that the user is a member of the company
  if not exists (
    select 1 from app.tenant_members tm
    where tm.user_id = auth.uid()
      and tm.tenant_id = v_company_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Cross-company access denied');
  end if;

  -- NEW: Check that the user has read permission for this DocType
  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', v_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: no read access to ' || p_doctype_key);
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', cs.id,
      'doctype_key', cs.doctype_key,
      'script_name', cs.script_name,
      'script_type', cs.script_type,
      'event_name', cs.event_name,
      'script_body', cs.script_body,
      'is_standard', cs.is_standard
    ) order by cs.script_name
  ) into v_result
  from app.erp_client_scripts cs
  where cs.doctype_key = p_doctype_key
    and cs.is_enabled = true
    and (cs.company_id is null or cs.company_id = v_company_id);

  return jsonb_build_object('ok', true, 'data', coalesce(v_result, '[]'::jsonb));
end;
$$;

-- ── 3. Harden: Create client script — validate script_body server-side ─────────

create or replace function public.erp_create_client_script(
  p_doctype_key   text,
  p_script_name   text,
  p_script_body   jsonb,
  p_event_name    text           default 'onLoad',
  p_company_id    uuid           default null,
  p_script_type   text           default 'form',
  p_is_enabled    boolean        default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result app.erp_client_scripts%rowtype;
  v_validation jsonb;
begin
  if not public.current_user_can_manage_client_scripts() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_client_scripts required');
  end if;

  if p_doctype_key is null or p_script_name is null or p_script_body is null then
    return jsonb_build_object('ok', false, 'error', 'doctype_key, script_name, and script_body are required');
  end if;

  if p_script_type != 'form' then
    return jsonb_build_object('ok', false, 'error', 'Only script_type = form is supported');
  end if;

  if p_event_name not in ('onLoad', 'onFieldChange', 'beforeSaveClientValidation') then
    return jsonb_build_object('ok', false, 'error', 'Invalid event_name. Allowed: onLoad, onFieldChange, beforeSaveClientValidation');
  end if;

  if not exists (select 1 from app.erp_doctypes where doctype_key = p_doctype_key) then
    return jsonb_build_object('ok', false, 'error', 'DocType not found: ' || p_doctype_key);
  end if;

  if exists (
    select 1 from app.erp_client_scripts
    where doctype_key = p_doctype_key
      and script_name = p_script_name
      and coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_company_id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    return jsonb_build_object('ok', false, 'error', 'A script with this name already exists for this DocType');
  end if;

  -- NEW: Validate script_body server-side
  v_validation := public.validate_client_script_body(p_script_body);
  if not (v_validation ->> 'ok')::boolean then
    return v_validation;
  end if;

  insert into app.erp_client_scripts (company_id, doctype_key, script_name, script_type, event_name, script_body, is_enabled, created_by)
  values (p_company_id, p_doctype_key, p_script_name, p_script_type, p_event_name, p_script_body, p_is_enabled, auth.uid())
  returning * into v_result;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'id', v_result.id,
    'doctype_key', v_result.doctype_key,
    'script_name', v_result.script_name,
    'event_name', v_result.event_name
  ));
end;
$$;

-- ── 4. Harden: Update client script — validate script_body server-side ─────────

create or replace function public.erp_update_client_script(
  p_id            uuid,
  p_script_name   text           default null,
  p_script_body   jsonb          default null,
  p_event_name    text           default null,
  p_is_enabled    boolean        default null,
  p_is_standard   boolean        default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_script app.erp_client_scripts%rowtype;
  v_validation jsonb;
begin
  if not public.current_user_can_manage_client_scripts() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_client_scripts required');
  end if;

  select * into v_script from app.erp_client_scripts where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Client script not found');
  end if;

  if v_script.is_standard and (select true from app.tenant_members where user_id = auth.uid() and tenant_id = app.current_company_id() and not app.current_user_has_manage_metadata()) then
    return jsonb_build_object('ok', false, 'error', 'Standard scripts cannot be modified by non-admin users');
  end if;

  if p_event_name is not null and p_event_name not in ('onLoad', 'onFieldChange', 'beforeSaveClientValidation') then
    return jsonb_build_object('ok', false, 'error', 'Invalid event_name');
  end if;

  -- NEW: Validate script_body server-side if provided
  if p_script_body is not null then
    v_validation := public.validate_client_script_body(p_script_body);
    if not (v_validation ->> 'ok')::boolean then
      return v_validation;
    end if;
  end if;

  update app.erp_client_scripts cs
  set
    script_name = coalesce(p_script_name, cs.script_name),
    script_body = coalesce(p_script_body, cs.script_body),
    event_name  = coalesce(p_event_name, cs.event_name),
    is_enabled  = coalesce(p_is_enabled, cs.is_enabled),
    is_standard = coalesce(p_is_standard, cs.is_standard),
    updated_at  = now()
  where cs.id = p_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ── 5. Harden RLS: Script read policy — also check doctype read access ────────

drop policy if exists "read_enabled_client_scripts" on app.erp_client_scripts;

create policy "read_enabled_client_scripts"
  on app.erp_client_scripts
  for select
  to authenticated
  using (
    is_enabled = true
    and (
      -- User has manage_client_scripts (admin/manager bypass doctype check)
      public.current_user_can_manage_client_scripts()
      or exists (
        select 1 from app.erp_doctypes d
        where d.doctype_key = erp_client_scripts.doctype_key
          and public.current_user_has_doctype_permission(d.doctype_key, 'read', app.current_company_id())
      )
    )
  );

-- ── 6. Grant execute for new/updated functions ─────────────────────────────────

grant execute on function public.erp_get_client_scripts_for_doctype(p_doctype_key text, p_company_id uuid)                             to authenticated;
grant execute on function public.erp_create_client_script(p_doctype_key text, p_script_name text, p_script_body jsonb, p_event_name text, p_company_id uuid, p_script_type text, p_is_enabled boolean) to authenticated;
grant execute on function public.erp_update_client_script(p_id uuid, p_script_name text, p_script_body jsonb, p_event_name text, p_is_enabled boolean, p_is_standard boolean)                             to authenticated;
