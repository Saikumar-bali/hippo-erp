-- Migration 0048: Fix save_company_user_permission upsert ambiguity
-- Applied to Supabase Cloud via Management API on 2026-06-05.
-- 0047 was already deployed before the bug was discovered, so this
-- migration ensures fresh database installs get the corrected function.
--
-- Bug: ON CONFLICT clause in 0047 referenced column names that were
-- shadowed by the function's output parameters, causing:
--   ERROR: column reference "doctype_key" is ambiguous
--
-- Fix: Replace ON CONFLICT with manual upsert using exception handling.

create or replace function public.save_company_user_permission(
  p_company_id uuid,
  p_payload jsonb
)
returns table (
  id uuid,
  doctype_key text,
  fieldname text,
  allowed_value text,
  apply_read boolean,
  apply_write boolean,
  is_active boolean
)
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_id uuid := nullif(trim(coalesce(p_payload->>'id', '')), '')::uuid;
  v_user_id uuid := (p_payload->>'user_id')::uuid;
  v_doctype_key text := trim(coalesce(p_payload->>'doctype_key', ''));
  v_fieldname text := trim(coalesce(p_payload->>'fieldname', ''));
  v_allowed_value text := trim(coalesce(p_payload->>'allowed_value', ''));
  v_apply_read boolean := coalesce((p_payload->>'apply_read')::boolean, true);
  v_apply_write boolean := coalesce((p_payload->>'apply_write')::boolean, false);
  v_is_active boolean := coalesce((p_payload->>'is_active')::boolean, true);
  v_saved app.company_user_permissions%rowtype;
begin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    raise exception 'Not authorized to manage user permissions';
  end if;

  if not exists (
    select 1
    from app.tenant_members tm
    where tm.tenant_id = p_company_id
      and tm.user_id = v_user_id
      and tm.is_active = true
  ) then
    raise exception 'User is not an active member of this company';
  end if;

  if v_doctype_key = '' or v_fieldname = '' or v_allowed_value = '' then
    raise exception 'User permission requires DocType, field, and allowed value';
  end if;

  if not exists (
    select 1
    from app.erp_docfields df
    where df.doctype_key = v_doctype_key
      and df.fieldname = v_fieldname
  ) then
    raise exception 'Field % not found on DocType %', v_fieldname, v_doctype_key;
  end if;

  if not v_apply_read and not v_apply_write then
    raise exception 'At least one of read/write applies must be enabled';
  end if;

  if v_id is null then
    begin
      insert into app.company_user_permissions (
        company_id, user_id, doctype_key, fieldname, allowed_value,
        apply_read, apply_write, is_active, created_by, updated_by
      )
      values (
        p_company_id, v_user_id, v_doctype_key, v_fieldname, v_allowed_value,
        v_apply_read, v_apply_write, v_is_active, auth.uid(), auth.uid()
      )
      returning app.company_user_permissions.* into v_saved;
    exception when unique_violation then
      update app.company_user_permissions cup
      set
        apply_read = v_apply_read,
        apply_write = v_apply_write,
        is_active = v_is_active,
        updated_by = auth.uid(),
        updated_at = now()
      where cup.company_id = p_company_id
        and cup.user_id = v_user_id
        and cup.doctype_key = v_doctype_key
        and cup.fieldname = v_fieldname
        and cup.allowed_value = v_allowed_value
      returning cup.* into v_saved;
    end;
  else
    update app.company_user_permissions cup
    set
      doctype_key = v_doctype_key,
      fieldname = v_fieldname,
      allowed_value = v_allowed_value,
      apply_read = v_apply_read,
      apply_write = v_apply_write,
      is_active = v_is_active,
      updated_by = auth.uid(),
      updated_at = now()
    where cup.id = v_id
      and cup.company_id = p_company_id
      and cup.user_id = v_user_id
    returning cup.* into v_saved;

    if not found then
      raise exception 'User permission rule not found';
    end if;
  end if;

  id := v_saved.id;
  doctype_key := v_saved.doctype_key;
  fieldname := v_saved.fieldname;
  allowed_value := v_saved.allowed_value;
  apply_read := v_saved.apply_read;
  apply_write := v_saved.apply_write;
  is_active := v_saved.is_active;
  return next;
end;
$$;
