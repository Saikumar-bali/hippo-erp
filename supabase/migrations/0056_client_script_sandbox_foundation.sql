-- 0056_client_script_sandbox_foundation.sql
-- Phase 6.9: Client Script Sandbox Foundation
--
-- 1. Create app.erp_client_scripts table with safe constraints
-- 2. Create permission helper for client script management
-- 3. Create 6 RPCs for client script CRUD
-- 4. Seed 4 permissions, grant to owner/admin
-- 5. Add CRM Lead fields for demo scripts (expected_value, referral_name)
-- 6. Seed demo CRM Lead client script
-- 7. Grant execute to authenticated
--
-- Design principles:
-- - Scripts use a JSON-rule DSL (not raw JS) for safe UI behavior
-- - Only safe actions: setValue, setRequired, setReadOnly, setVisible, showMessage, validateRequired
-- - No window/document/localStorage/fetch/fetch access
-- - No backend permission bypass
-- - No docstatus/workflow_state changes
-- - Script errors are non-fatal UI warnings

-- ── 1. Client Scripts Table ────────────────────────────────────────────────────

create table if not exists app.erp_client_scripts (
  id            uuid        primary key default gen_random_uuid(),
  company_id    uuid        references app.companies(id) on delete cascade,
  doctype_key   text        not null references app.erp_doctypes(doctype_key) on delete cascade,
  script_name   text        not null,
  script_type   text        not null default 'form',
  event_name    text        not null default 'onLoad',
  script_body   jsonb       not null default '{"rules":[]}'::jsonb,
  is_enabled    boolean     not null default true,
  is_standard   boolean     not null default false,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Validate script_type
alter table app.erp_client_scripts
  add constraint chk_client_script_type
  check (script_type = 'form');

-- Validate event_name
alter table app.erp_client_scripts
  add constraint chk_client_script_event
  check (event_name in ('onLoad', 'onFieldChange', 'beforeSaveClientValidation'));

-- Unique per company/doctype/script_name
-- When company_id is null, the script is global/standard
create unique index idx_client_scripts_unique
  on app.erp_client_scripts (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), doctype_key, script_name);

-- Enable RLS
alter table app.erp_client_scripts enable row level security;

-- ── 2. RLS Policies ────────────────────────────────────────────────────────────

-- All authenticated users can read enabled scripts for doctypes they can access
create policy "read_enabled_client_scripts"
  on app.erp_client_scripts
  for select
  to authenticated
  using (is_enabled = true);

-- Only users with manage_client_scripts or owner/admin can manage scripts
create policy "manage_client_scripts"
  on app.erp_client_scripts
  for all
  to authenticated
  using (
    app.current_user_has_manage_metadata()
    or exists (
      select 1 from app.tenant_members tm
      join app.company_role_assignments cra on cra.user_id = tm.user_id and cra.company_id = tm.tenant_id
      join app.company_role_permissions crp on crp.role_id = cra.role_id
      where tm.user_id = auth.uid()
        and tm.tenant_id = app.current_company_id()
        and crp.permission_key = 'manage_client_scripts'
        and crp.is_granted = true
    )
  );

-- ── 3. Client Script Permission Helper ─────────────────────────────────────────

create or replace function public.current_user_can_manage_client_scripts()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from app.tenant_members tm
    join app.company_role_assignments cra on cra.user_id = tm.user_id and cra.company_id = tm.tenant_id
    join app.company_role_permissions crp on crp.role_id = cra.role_id
    where tm.user_id = auth.uid()
      and tm.tenant_id = app.current_company_id()
      and crp.permission_key = 'manage_client_scripts'
      and crp.is_granted = true
  )
  or app.current_user_has_manage_metadata();
$$;

-- ── 4. RPC: List client scripts (management) ───────────────────────────────────

create or replace function public.erp_list_client_scripts()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.current_user_can_manage_client_scripts() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_client_scripts required');
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', cs.id,
      'company_id', cs.company_id,
      'doctype_key', cs.doctype_key,
      'script_name', cs.script_name,
      'script_type', cs.script_type,
      'event_name', cs.event_name,
      'script_body', cs.script_body,
      'is_enabled', cs.is_enabled,
      'is_standard', cs.is_standard,
      'created_by', cs.created_by,
      'created_at', cs.created_at,
      'updated_at', cs.updated_at
    ) order by cs.doctype_key, cs.script_name
  ) into v_result
  from app.erp_client_scripts cs;

  return jsonb_build_object('ok', true, 'data', coalesce(v_result, '[]'::jsonb));
end;
$$;

-- ── 5. RPC: Get enabled scripts for a doctype (company-scoped) ─────────────────

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

  -- Check that the user has basic doctype access
  if not exists (
    select 1 from app.tenant_members tm
    where tm.user_id = auth.uid()
      and tm.tenant_id = v_company_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Cross-company access denied');
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

-- ── 6. RPC: Create client script ───────────────────────────────────────────────

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

-- ── 7. RPC: Update client script ───────────────────────────────────────────────

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

-- ── 8. RPC: Disable/enable client script ───────────────────────────────────────

create or replace function public.erp_disable_client_script(
  p_id         uuid,
  p_is_enabled boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_script app.erp_client_scripts%rowtype;
begin
  if not public.current_user_can_manage_client_scripts() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_client_scripts required');
  end if;

  select * into v_script from app.erp_client_scripts where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Client script not found');
  end if;

  update app.erp_client_scripts
  set is_enabled = p_is_enabled, updated_at = now()
  where id = p_id;

  return jsonb_build_object('ok', true, 'is_enabled', p_is_enabled);
end;
$$;

-- ── 9. RPC: Delete client script ───────────────────────────────────────────────

create or replace function public.erp_delete_client_script(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_script app.erp_client_scripts%rowtype;
begin
  if not public.current_user_can_manage_client_scripts() then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: manage_client_scripts required');
  end if;

  select * into v_script from app.erp_client_scripts where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Client script not found');
  end if;

  if v_script.is_standard then
    return jsonb_build_object('ok', false, 'error', 'Standard scripts cannot be deleted');
  end if;

  delete from app.erp_client_scripts where id = p_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ── 10. Seed Client Script Permissions ─────────────────────────────────────────

insert into app.permissions (permission_key, module_key, module_label, permission_label, description, sort_order)
values
  ('view_client_scripts',   'developer', 'Developer', 'View Client Scripts',   'View client scripts for DocTypes.',      2201),
  ('create_client_script',  'developer', 'Developer', 'Create Client Script',  'Create new client scripts.',             2202),
  ('update_client_script',  'developer', 'Developer', 'Update Client Script',  'Edit existing client scripts.',          2203),
  ('delete_client_script',  'developer', 'Developer', 'Delete Client Script',  'Delete client scripts.',                 2204),
  ('manage_client_scripts', 'developer', 'Developer', 'Manage Client Scripts', 'Full access to manage client scripts.',  2205)
on conflict (permission_key) do update
set
  module_key       = excluded.module_key,
  module_label     = excluded.module_label,
  permission_label = excluded.permission_label,
  description      = excluded.description,
  sort_order       = excluded.sort_order,
  is_active        = true,
  updated_at       = now();

-- Grant to owner and admin system roles
insert into app.role_permission_grants (role, permission_key, is_granted)
values
  ('owner'::app.role_type, 'view_client_scripts',   true),
  ('admin'::app.role_type, 'view_client_scripts',   true),
  ('owner'::app.role_type, 'create_client_script',  true),
  ('admin'::app.role_type, 'create_client_script',  true),
  ('owner'::app.role_type, 'update_client_script',  true),
  ('admin'::app.role_type, 'update_client_script',  true),
  ('owner'::app.role_type, 'delete_client_script',  true),
  ('admin'::app.role_type, 'delete_client_script',  true),
  ('owner'::app.role_type, 'manage_client_scripts', true),
  ('admin'::app.role_type, 'manage_client_scripts', true)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

-- ── 11. Add CRM Lead fields for demo scripts ───────────────────────────────────

-- expected_value (Float) — for Rule A: when status = Qualified, make required
insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, options, is_required, is_unique, is_readonly, is_hidden, in_list_view, in_standard_filter, sort_order)
values
  ('crm_lead', 'expected_value', 'Expected Value', 'Float', '{}'::jsonb, false, false, false, false, false, false, 55),
  ('crm_lead', 'referral_name', 'Referral Name', 'Data', '{}'::jsonb, false, false, false, false, false, false, 56)
on conflict (doctype_key, fieldname) do update
set
  label        = excluded.label,
  fieldtype    = excluded.fieldtype,
  options      = excluded.options,
  sort_order   = excluded.sort_order,
  is_active    = true;

-- Update CRM Lead form layout to include new fields
update app.erp_form_layouts
set sections_json = '[
  {"section":"Lead Details","columns":2,"fields":["lead_name","company_name","email","phone","referral_name"]},
  {"section":"Qualification","columns":2,"fields":["source","status","expected_value","owner_name","is_active"]},
  {"section":"Notes","columns":1,"fields":["notes"]}
]'::jsonb
where doctype_key = 'crm_lead'
  and layout_key = 'default';

-- ── 12. Seed Demo CRM Lead Client Script ───────────────────────────────────────

insert into app.erp_client_scripts (doctype_key, script_name, script_type, event_name, script_body, is_enabled, is_standard, created_by)
values
  (
    'crm_lead',
    'CRM Lead Qualification Rules',
    'form',
    'onFieldChange',
    '{
      "rules": [
        {
          "when": {
            "field": "status",
            "operator": "equals",
            "value": "Qualified"
          },
          "actions": [
            {
              "type": "setRequired",
              "field": "expected_value",
              "value": true
            },
            {
              "type": "showMessage",
              "level": "info",
              "message": "Expected value is required for qualified leads."
            }
          ]
        },
        {
          "when": {
            "field": "source",
            "operator": "equals",
            "value": "Referral"
          },
          "actions": [
            {
              "type": "setVisible",
              "field": "referral_name",
              "value": true
            }
          ]
        }
      ]
    }'::jsonb,
    true,
    true,
    auth.uid()
  )
on conflict (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), doctype_key, script_name)
do nothing;

-- ── 13. Grant execute to authenticated ─────────────────────────────────────────

grant execute on function public.erp_list_client_scripts()                                                                             to authenticated;
grant execute on function public.erp_get_client_scripts_for_doctype(p_doctype_key text, p_company_id uuid)                              to authenticated;
grant execute on function public.erp_create_client_script(p_doctype_key text, p_script_name text, p_script_body jsonb, p_event_name text, p_company_id uuid, p_script_type text, p_is_enabled boolean) to authenticated;
grant execute on function public.erp_update_client_script(p_id uuid, p_script_name text, p_script_body jsonb, p_event_name text, p_is_enabled boolean, p_is_standard boolean)                              to authenticated;
grant execute on function public.erp_disable_client_script(p_id uuid, p_is_enabled boolean)                                              to authenticated;
grant execute on function public.erp_delete_client_script(p_id uuid)                                                                      to authenticated;
