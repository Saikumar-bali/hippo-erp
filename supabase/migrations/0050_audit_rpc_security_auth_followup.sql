-- 0050_audit_rpc_security_auth_followup.sql
-- Phase 6.6.1: Audit RPC Security Hardening
--
-- Problem: Audit/version RPCs (from migration 0049) return full data without:
--   1. Document-level permission checks (document_matches_user_permission_rules)
--   2. Backend permlevel masking (level-1 fields leaked in responses)
--
-- Fix: Replace the 3 read RPCs with hardened versions that enforce both checks.
-- Also uses existing filter_document_data_by_user_access() for version data filtering.

-- ── Helper: mask audit changes based on permlevel ──────────────────────────

create or replace function public.erp_mask_audit_changes(
  p_user_id uuid,
  p_company_id uuid,
  p_doctype_key text,
  p_changes jsonb,
  p_action text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_max_read integer;
  v_masked jsonb;
  v_key text;
  v_val jsonb;
begin
  if p_changes is null then
    return null;
  end if;

  v_max_read := public.get_user_doctype_max_permlevel(p_user_id, p_company_id, p_doctype_key, 'read');
  if v_max_read < 0 then
    return '{}'::jsonb;
  end if;

  if p_action = 'create' then
    -- changes = {doctype_key: '...', data: {...full data...}}
    -- Filter the 'data' sub-object
    v_masked := public.filter_document_data_by_user_access(p_user_id, p_company_id, p_doctype_key, p_changes->'data');
    return jsonb_build_object('doctype_key', p_changes->'doctype_key', 'data', v_masked);

  elsif p_action = 'update' then
    -- changes = {doctype_key: '...', diff: {field: {old, new}}, version: N}
    -- Filter diff entries to only include fields with permlevel <= max_read
    v_masked := '{}'::jsonb;
    if p_changes ? 'diff' then
      for v_key in select jsonb_object_keys(p_changes->'diff')
      loop
        -- Check if this field's permlevel is accessible
        if exists (
          select 1 from app.erp_docfields df
          where df.doctype_key = p_doctype_key
            and df.fieldname = v_key
            and df.permlevel <= v_max_read
        ) then
          v_masked := v_masked || jsonb_build_object(v_key, p_changes->'diff'->v_key);
        end if;
      end loop;
    end if;
    return jsonb_build_object('doctype_key', p_changes->'doctype_key', 'diff', v_masked, 'version', p_changes->'version');

  else
    -- deactivate, reactivate: no field-level data to mask
    return p_changes;
  end if;
end;
$$;

-- ── 1. Replace erp_list_document_audit_events with hardened version ────────

create or replace function public.erp_list_document_audit_events(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_doc_data jsonb;
  v_result jsonb;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped
    into v_doctype
    from app.erp_doctypes
    where doctype_key = p_doctype_key;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'DocType not found');
  end if;

  if v_doctype.storage_strategy != 'generic_json' then
    return jsonb_build_object('ok', false, 'error', 'DocType uses physical_rpc storage');
  end if;

  -- Check read permission
  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: read access required');
  end if;

  -- Fetch document data to check record-level permission rules
  select d.data into v_doc_data
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  -- Enforce record-level permission rules
  if not public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, v_doc_data, 'read') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: record-level access denied');
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', al.id,
      'action', al.action,
      'entity_id', al.entity_id,
      'changes', public.erp_mask_audit_changes(auth.uid(), p_company_id, p_doctype_key, al.changes, al.action),
      'user_id', al.user_id,
      'created_at', al.created_at
    ) order by al.created_at desc
  ) into v_result
  from app.erp_audit_logs al
  where al.entity_type = 'document'
    and al.entity_id = p_document_id::text
    and al.tenant_id = p_company_id;

  return jsonb_build_object('ok', true, 'data', coalesce(v_result, '[]'::jsonb));
end;
$$;

-- ── 2. Replace erp_list_document_versions with hardened version ────────────

create or replace function public.erp_list_document_versions(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_doc_data jsonb;
  v_result jsonb;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped
    into v_doctype
    from app.erp_doctypes
    where doctype_key = p_doctype_key;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'DocType not found');
  end if;

  if v_doctype.storage_strategy != 'generic_json' then
    return jsonb_build_object('ok', false, 'error', 'DocType uses physical_rpc storage');
  end if;

  -- Check read permission
  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: read access required');
  end if;

  -- Fetch document data to check record-level permission rules
  select d.data into v_doc_data
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  -- Enforce record-level permission rules
  if not public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, v_doc_data, 'read') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: record-level access denied');
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', dv.id,
      'version_number', dv.version_number,
      'changed_by', dv.changed_by,
      'changed_at', dv.changed_at,
      'change_reason', dv.change_reason,
      'data', public.filter_document_data_by_user_access(auth.uid(), p_company_id, p_doctype_key, dv.data)
    ) order by dv.version_number desc
  ) into v_result
  from app.erp_document_versions dv
  join app.erp_documents d on d.id = dv.document_id
  where dv.document_id = p_document_id
    and dv.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

  return jsonb_build_object('ok', true, 'data', coalesce(v_result, '[]'::jsonb));
end;
$$;

-- ── 3. Replace erp_get_document_version_diff with hardened version ─────────

create or replace function public.erp_get_document_version_diff(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid,
  p_version_from int,
  p_version_to int
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_doc_data jsonb;
  v_data_from jsonb;
  v_data_to jsonb;
  v_diff jsonb := '{}'::jsonb;
  v_key text;
  v_old_val text;
  v_new_val text;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped
    into v_doctype
    from app.erp_doctypes
    where doctype_key = p_doctype_key;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'DocType not found');
  end if;

  if v_doctype.storage_strategy != 'generic_json' then
    return jsonb_build_object('ok', false, 'error', 'DocType uses physical_rpc storage');
  end if;

  -- Check read permission
  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: read access required');
  end if;

  -- Fetch document data to check record-level permission rules
  select d.data into v_doc_data
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  -- Enforce record-level permission rules
  if not public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, v_doc_data, 'read') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: record-level access denied');
  end if;

  -- Get data for both versions
  select dv.data into v_data_from
  from app.erp_document_versions dv
  join app.erp_documents d on d.id = dv.document_id
  where dv.document_id = p_document_id
    and dv.doctype_key = p_doctype_key
    and dv.version_number = p_version_from
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Version not found: ' || p_version_from);
  end if;

  select dv.data into v_data_to
  from app.erp_document_versions dv
  join app.erp_documents d on d.id = dv.document_id
  where dv.document_id = p_document_id
    and dv.doctype_key = p_doctype_key
    and dv.version_number = p_version_to
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Version not found: ' || p_version_to);
  end if;

  -- Mask both versions based on user's permlevel access
  v_data_from := public.filter_document_data_by_user_access(auth.uid(), p_company_id, p_doctype_key, v_data_from);
  v_data_to := public.filter_document_data_by_user_access(auth.uid(), p_company_id, p_doctype_key, v_data_to);

  -- Compute diff from masked data
  for v_key in select jsonb_object_keys(v_data_to)
  loop
    v_old_val := v_data_from ->> v_key;
    v_new_val := v_data_to ->> v_key;
    if coalesce(v_old_val, '') != coalesce(v_new_val, '') then
      v_diff := v_diff || jsonb_build_object(v_key, jsonb_build_object('old', v_old_val, 'new', v_new_val));
    end if;
  end loop;

  -- Also check for keys in v_data_from that are not in v_data_to (removed fields)
  for v_key in select jsonb_object_keys(v_data_from)
  loop
    if not (v_data_to ? v_key) then
      v_old_val := v_data_from ->> v_key;
      v_diff := v_diff || jsonb_build_object(v_key, jsonb_build_object('old', v_old_val, 'new', null));
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'version_from', p_version_from,
    'version_to', p_version_to,
    'diff', v_diff,
    'data_from', v_data_from,
    'data_to', v_data_to
  );
end;
$$;

-- ── 4. Grant execute permissions ─────────────────────────────────────────────

grant execute on function public.erp_mask_audit_changes(uuid, uuid, text, jsonb, text) to authenticated;
grant execute on function public.erp_list_document_audit_events(text, uuid, uuid) to authenticated;
grant execute on function public.erp_list_document_versions(text, uuid, uuid) to authenticated;
grant execute on function public.erp_get_document_version_diff(text, uuid, uuid, int, int) to authenticated;
