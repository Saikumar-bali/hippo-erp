-- 0049_audit_trail_version_timeline.sql
-- Phase 6.6: Audit Trail and Version Timeline Foundation
-- Schema: app (RLS), public (RPC functions)
--
-- 1. Add audit log writes to erp_create_document, erp_update_document, erp_deactivate_document
-- 2. Add RPCs: erp_list_document_audit_events, erp_list_document_versions, erp_get_document_version_diff
-- 3. Grant execute to authenticated

-- ── 1. Replace erp_create_document to write audit log ────────────────────────

create or replace function public.erp_create_document(
  p_doctype_key text,
  p_company_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_field record;
  v_fieldname text;
  v_value text;
  v_is_required boolean;
  v_doc_id uuid;
  v_title text;
  v_max_write integer;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped, label
    into v_doctype
    from app.erp_doctypes
    where doctype_key = p_doctype_key;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'DocType not found: ' || p_doctype_key);
  end if;

  if not v_doctype.is_active then
    return jsonb_build_object('ok', false, 'error', 'DocType is inactive');
  end if;

  if v_doctype.storage_strategy != 'generic_json' then
    return jsonb_build_object('ok', false, 'error', 'DocType uses physical_rpc storage; use its dedicated API');
  end if;

  if not public.current_user_has_doctype_permission(p_doctype_key, 'create', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: create access required');
  end if;

  v_max_write := public.get_user_doctype_max_permlevel(auth.uid(), p_company_id, p_doctype_key, 'write');

  for v_fieldname, v_value in
    select *
    from jsonb_each_text(coalesce(p_data, '{}'::jsonb))
  loop
    select df.fieldname, df.permlevel
    into v_field
    from app.erp_docfields df
    where df.doctype_key = p_doctype_key
      and df.fieldname = v_fieldname;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'Unknown field: ' || v_fieldname);
    end if;

    if v_field.permlevel > v_max_write then
      return jsonb_build_object('ok', false, 'error', format('Permission denied: write access required for permlevel %s field %s', v_field.permlevel, v_fieldname));
    end if;
  end loop;

  for v_field in
    select fieldname, fieldtype, is_required, label
    from app.erp_docfields
    where doctype_key = p_doctype_key
      and not is_hidden
      and fieldname not in ('id', 'tenant_id', 'created_by', 'updated_by', 'created_at', 'updated_at')
  loop
    v_fieldname := v_field.fieldname;
    v_is_required := v_field.is_required;

    if v_is_required then
      if p_data ? v_fieldname then
        v_value := p_data->>v_fieldname;
        if v_value is null or v_value = '' then
          return jsonb_build_object('ok', false, 'error', 'Required field missing: ' || v_field.label || ' (' || v_fieldname || ')');
        end if;
      else
        return jsonb_build_object('ok', false, 'error', 'Required field missing: ' || v_field.label || ' (' || v_fieldname || ')');
      end if;
    end if;
  end loop;

  if not public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, coalesce(p_data, '{}'::jsonb), 'write') then
    return jsonb_build_object('ok', false, 'error', 'User permission rule does not allow this record value');
  end if;

  v_title := p_data->>'title';
  if v_title is null or v_title = '' then
    v_title := coalesce(p_data->>'name', p_data->>'lead_name', p_data->>'opportunity_name');
  end if;
  if v_title is null or v_title = '' then
    v_title := v_doctype.label;
  end if;

  insert into app.erp_documents (doctype_key, company_id, title, data, created_by, updated_by)
  values (p_doctype_key, p_company_id, v_title, p_data, auth.uid(), auth.uid())
  returning id into v_doc_id;

  insert into app.erp_document_versions (document_id, doctype_key, version_number, data, changed_by)
  values (v_doc_id, p_doctype_key, 1, p_data, auth.uid());

  -- Audit log: record creation
  insert into app.erp_audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes)
  values (
    p_company_id,
    auth.uid(),
    'create',
    'document',
    v_doc_id::text,
    jsonb_build_object('doctype_key', p_doctype_key, 'data', p_data)
  );

  return jsonb_build_object('ok', true, 'document_id', v_doc_id);
end;
$$;

-- ── 2. Replace erp_update_document to write audit log with diff ──────────────

create or replace function public.erp_update_document(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_doc record;
  v_field record;
  v_fieldname text;
  v_value text;
  v_is_required boolean;
  v_new_data jsonb;
  v_title text;
  v_max_version int;
  v_old_data jsonb;
  v_max_write integer;
  v_diff jsonb := '{}'::jsonb;
  v_old_val text;
  v_new_val text;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped, label
    into v_doctype
    from app.erp_doctypes
    where doctype_key = p_doctype_key;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'DocType not found');
  end if;

  if not v_doctype.is_active then
    return jsonb_build_object('ok', false, 'error', 'DocType is inactive');
  end if;

  if v_doctype.storage_strategy != 'generic_json' then
    return jsonb_build_object('ok', false, 'error', 'DocType uses physical_rpc storage');
  end if;

  if not public.current_user_has_doctype_permission(p_doctype_key, 'update', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: update access required');
  end if;

  select * into v_doc
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
    and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'write');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  v_max_write := public.get_user_doctype_max_permlevel(auth.uid(), p_company_id, p_doctype_key, 'write');

  for v_fieldname, v_value in
    select *
    from jsonb_each_text(coalesce(p_data, '{}'::jsonb))
  loop
    select df.fieldname, df.permlevel
    into v_field
    from app.erp_docfields df
    where df.doctype_key = p_doctype_key
      and df.fieldname = v_fieldname;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'Unknown field: ' || v_fieldname);
    end if;

    if v_field.permlevel > v_max_write then
      return jsonb_build_object('ok', false, 'error', format('Permission denied: write access required for permlevel %s field %s', v_field.permlevel, v_fieldname));
    end if;
  end loop;

  for v_field in
    select fieldname, fieldtype, is_required, label
    from app.erp_docfields
    where doctype_key = p_doctype_key
      and not is_hidden
      and fieldname not in ('id', 'tenant_id', 'created_by', 'updated_by', 'created_at', 'updated_at')
  loop
    v_fieldname := v_field.fieldname;
    v_is_required := v_field.is_required;

    if v_is_required and p_data ? v_fieldname then
      v_value := p_data->>v_fieldname;
      if v_value is null or v_value = '' then
        return jsonb_build_object('ok', false, 'error', 'Required field missing: ' || v_field.label || ' (' || v_fieldname || ')');
      end if;
    end if;
  end loop;

  v_old_data := v_doc.data;
  v_new_data := v_old_data || p_data;

  if not public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, v_new_data, 'write') then
    return jsonb_build_object('ok', false, 'error', 'User permission rule does not allow this record value');
  end if;

  -- Compute diff: only changed fields
  for v_fieldname, v_new_val in select * from jsonb_each_text(p_data)
  loop
    v_old_val := v_old_data ->> v_fieldname;
    if coalesce(v_old_val, '') != coalesce(v_new_val, '') then
      v_diff := v_diff || jsonb_build_object(v_fieldname, jsonb_build_object('old', v_old_val, 'new', v_new_val));
    end if;
  end loop;

  v_title := v_new_data->>'title';
  if v_title is null or v_title = '' then
    v_title := coalesce(v_new_data->>'name', v_new_data->>'lead_name', v_new_data->>'opportunity_name');
  end if;
  if v_title is null or v_title = '' then
    v_title := v_doctype.label;
  end if;

  update app.erp_documents
  set data = v_new_data, title = v_title, updated_by = auth.uid(), updated_at = now()
  where id = p_document_id;

  select coalesce(max(version_number), 0) into v_max_version
  from app.erp_document_versions
  where document_id = p_document_id;

  insert into app.erp_document_versions (document_id, doctype_key, version_number, data, changed_by)
  values (p_document_id, p_doctype_key, v_max_version + 1, v_new_data, auth.uid());

  -- Audit log: record update with diff
  if v_diff != '{}'::jsonb then
    insert into app.erp_audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes)
    values (
      p_company_id,
      auth.uid(),
      'update',
      'document',
      p_document_id::text,
      jsonb_build_object('doctype_key', p_doctype_key, 'diff', v_diff, 'version', v_max_version + 1)
    );
  end if;

  return jsonb_build_object('ok', true, 'document_id', p_document_id);
end;
$$;

-- ── 3. Replace erp_deactivate_document to write audit log ────────────────────

create or replace function public.erp_deactivate_document(
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
  v_doc record;
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

  if not public.current_user_has_doctype_permission(p_doctype_key, 'deactivate', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: deactivate access required');
  end if;

  select * into v_doc
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
    and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'write');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  update app.erp_documents
  set is_active = false, updated_by = auth.uid(), updated_at = now()
  where id = p_document_id;

  -- Audit log: record deactivation
  insert into app.erp_audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes)
  values (
    p_company_id,
    auth.uid(),
    'deactivate',
    'document',
    p_document_id::text,
    jsonb_build_object('doctype_key', p_doctype_key, 'title', v_doc.title)
  );

  return jsonb_build_object('ok', true, 'document_id', p_document_id);
end;
$$;

-- ── 4. Replace erp_reactivate_document to write audit log ────────────────────

create or replace function public.erp_reactivate_document(
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
  v_doc record;
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

  if not public.current_user_has_doctype_permission(p_doctype_key, 'update', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: update access required');
  end if;

  select * into v_doc
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
    and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'write');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  update app.erp_documents
  set is_active = true, updated_by = auth.uid(), updated_at = now()
  where id = p_document_id;

  -- Audit log: record reactivation
  insert into app.erp_audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes)
  values (
    p_company_id,
    auth.uid(),
    'reactivate',
    'document',
    p_document_id::text,
    jsonb_build_object('doctype_key', p_doctype_key, 'title', v_doc.title)
  );

  return jsonb_build_object('ok', true, 'document_id', p_document_id);
end;
$$;

-- ── 5. RPC: list audit events for a document ────────────────────────────────

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

  select jsonb_agg(
    jsonb_build_object(
      'id', al.id,
      'action', al.action,
      'entity_id', al.entity_id,
      'changes', al.changes,
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

-- ── 6. RPC: list document versions ───────────────────────────────────────────

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

  select jsonb_agg(
    jsonb_build_object(
      'id', dv.id,
      'version_number', dv.version_number,
      'changed_by', dv.changed_by,
      'changed_at', dv.changed_at,
      'change_reason', dv.change_reason,
      'data', dv.data
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

-- ── 7. RPC: get document version diff ────────────────────────────────────────

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

  -- Compute diff
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

-- ── 8. Grant execute permissions ─────────────────────────────────────────────

grant execute on function public.erp_list_document_audit_events(text, uuid, uuid) to authenticated;
grant execute on function public.erp_list_document_versions(text, uuid, uuid) to authenticated;
grant execute on function public.erp_get_document_version_diff(text, uuid, uuid, int, int) to authenticated;
