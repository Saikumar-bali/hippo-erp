-- 0052_workflow_security_regression_fix.sql
-- Phase 6.7.1: Workflow Security Regression Gate
--
-- Migration 0051 overwrote Phase 6.5/6.6.1 protections in 8 RPCs:
--   erp_list_documents       — lost field masking + record filtering
--   erp_get_document         — lost field masking + record filtering
--   erp_create_document      — lost permlevel write check + record write filter
--   erp_update_document      — lost permlevel write check + record write filter
--   erp_apply_workflow_action — no record-level permission check
--   erp_submit_document      — no record-level permission check
--   erp_cancel_document      — no record-level permission check
--   erp_list_workflow_actions — no record-level permission check
--
-- This migration restores all protections while keeping Phase 6.7 workflow features.

-- ── 1. Restore erp_list_documents ─────────────────────────────────────────
-- Must apply: filter_document_data_by_user_access + document_matches_user_permission_rules

create or replace function public.erp_list_documents(
  p_doctype_key text,
  p_company_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_result jsonb;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped, label
    into v_doctype
    from app.erp_doctypes
    where doctype_key = p_doctype_key;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'DocType not found: ' || p_doctype_key);
  end if;

  if not v_doctype.is_active then
    return jsonb_build_object('ok', false, 'error', 'DocType is inactive: ' || p_doctype_key);
  end if;

  if v_doctype.storage_strategy != 'generic_json' then
    return jsonb_build_object('ok', false, 'error', 'DocType ' || p_doctype_key || ' uses physical_rpc storage; use its dedicated API instead');
  end if;

  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: read access required');
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'document_number', d.document_number,
      'title', d.title,
      'data', public.filter_document_data_by_user_access(auth.uid(), p_company_id, p_doctype_key, d.data),
      'is_active', d.is_active,
      'docstatus', d.docstatus,
      'workflow_state', d.workflow_state,
      'created_by', d.created_by,
      'updated_by', d.updated_by,
      'created_at', d.created_at,
      'updated_at', d.updated_at
    ) order by d.created_at desc
  ) into v_result
  from app.erp_documents d
  where d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
    and d.is_active = true
    and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'read');

  return jsonb_build_object('ok', true, 'data', coalesce(v_result, '[]'::jsonb));
end;
$$;

-- ── 2. Restore erp_get_document ───────────────────────────────────────────
-- Must apply: filter_document_data_by_user_access + document_matches_user_permission_rules

create or replace function public.erp_get_document(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid
) returns jsonb
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

  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  select
    d.id, d.doctype_key, d.company_id, d.document_number, d.title, d.data,
    d.is_active, d.docstatus, d.workflow_state,
    d.submitted_at, d.submitted_by, d.cancelled_at, d.cancelled_by, d.amend_count,
    d.created_by, d.updated_by, d.created_at, d.updated_at
  into v_doc
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
    and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'read');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'id', v_doc.id,
      'doctype_key', v_doc.doctype_key,
      'company_id', v_doc.company_id,
      'document_number', v_doc.document_number,
      'title', v_doc.title,
      'data', public.filter_document_data_by_user_access(auth.uid(), p_company_id, p_doctype_key, v_doc.data),
      'is_active', v_doc.is_active,
      'docstatus', v_doc.docstatus,
      'workflow_state', v_doc.workflow_state,
      'submitted_at', v_doc.submitted_at,
      'submitted_by', v_doc.submitted_by,
      'cancelled_at', v_doc.cancelled_at,
      'cancelled_by', v_doc.cancelled_by,
      'amend_count', v_doc.amend_count,
      'created_by', v_doc.created_by,
      'updated_by', v_doc.updated_by,
      'created_at', v_doc.created_at,
      'updated_at', v_doc.updated_at
    )
  );
end;
$$;

-- ── 3. Restore erp_create_document ────────────────────────────────────────
-- Must apply: permlevel write check + document_matches_user_permission_rules write

create or replace function public.erp_create_document(
  p_doctype_key text,
  p_company_id uuid,
  p_data jsonb
) returns jsonb
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
  v_initial_workflow_state text;
  v_max_write integer;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped, label, workflow_key
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

  -- Phase 6.5: enforce field-level write permission
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

  -- Validate required fields
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

  -- Phase 6.5: enforce record-level write permission
  if not public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, coalesce(p_data, '{}'::jsonb), 'write') then
    return jsonb_build_object('ok', false, 'error', 'User permission rule does not allow this record value');
  end if;

  -- Extract title
  v_title := p_data->>'title';
  if v_title is null or v_title = '' then
    v_title := coalesce(p_data->>'name', p_data->>'lead_name', p_data->>'opportunity_name');
  end if;
  if v_title is null or v_title = '' then
    v_title := v_doctype.label;
  end if;

  -- Determine initial workflow state
  if v_doctype.workflow_key is not null then
    select s.state_key into v_initial_workflow_state
    from app.erp_workflow_states s
    where s.workflow_key = v_doctype.workflow_key
    order by s.sort_order
    limit 1;
  end if;

  -- Insert document
  insert into app.erp_documents (doctype_key, company_id, title, data, created_by, updated_by, docstatus, workflow_state)
  values (p_doctype_key, p_company_id, v_title, p_data, auth.uid(), auth.uid(), 0, v_initial_workflow_state)
  returning id into v_doc_id;

  -- Write initial version
  insert into app.erp_document_versions (document_id, doctype_key, version_number, data, changed_by, docstatus, workflow_state)
  values (v_doc_id, p_doctype_key, 1, p_data, auth.uid(), 0, v_initial_workflow_state);

  return jsonb_build_object('ok', true, 'document_id', v_doc_id);
end;
$$;

-- ── 4. Restore erp_update_document ────────────────────────────────────────
-- Must apply: permlevel write check + document_matches_user_permission_rules write + block docstatus/workflow_state

create or replace function public.erp_update_document(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid,
  p_data jsonb
) returns jsonb
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
  v_clean_data jsonb;
  v_max_write integer;
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

  -- Phase 6.7: fetch existing document (with record-level permission check)
  select * into v_doc
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
    and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'write');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  -- Phase 6.7: enforce docstatus rules
  if v_doc.docstatus != 0 then
    return jsonb_build_object('ok', false, 'error', 'Cannot update: document is ' ||
      case v_doc.docstatus when 1 then 'submitted' when 2 then 'cancelled' end ||
      ' (docstatus=' || v_doc.docstatus || '). Use amend to create a new draft.');
  end if;

  -- Phase 6.7: strip docstatus and workflow_state from update payload (backend-only)
  v_clean_data := p_data - 'docstatus' - 'workflow_state' - 'submitted_at' - 'submitted_by' - 'cancelled_at' - 'cancelled_by' - 'amend_count';

  -- Phase 6.5: enforce field-level write permission
  v_max_write := public.get_user_doctype_max_permlevel(auth.uid(), p_company_id, p_doctype_key, 'write');

  for v_fieldname, v_value in
    select *
    from jsonb_each_text(coalesce(v_clean_data, '{}'::jsonb))
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

  -- Validate required fields
  for v_field in
    select fieldname, fieldtype, is_required, label
    from app.erp_docfields
    where doctype_key = p_doctype_key
      and not is_hidden
      and fieldname not in ('id', 'tenant_id', 'created_by', 'updated_by', 'created_at', 'updated_at')
  loop
    v_fieldname := v_field.fieldname;
    v_is_required := v_field.is_required;

    if v_is_required and v_clean_data ? v_fieldname then
      v_value := v_clean_data->>v_fieldname;
      if v_value is null or v_value = '' then
        return jsonb_build_object('ok', false, 'error', 'Required field missing: ' || v_field.label || ' (' || v_fieldname || ')');
      end if;
    end if;
  end loop;

  -- Merge old and new data
  v_old_data := v_doc.data;
  v_new_data := v_old_data || v_clean_data;

  -- Phase 6.5: enforce record-level write permission on merged data
  if not public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, v_new_data, 'write') then
    return jsonb_build_object('ok', false, 'error', 'User permission rule does not allow this record value');
  end if;

  v_title := v_new_data->>'title';
  if v_title is null or v_title = '' then
    v_title := coalesce(v_new_data->>'name', v_new_data->>'lead_name', v_new_data->>'opportunity_name');
  end if;
  if v_title is null or v_title = '' then
    v_title := v_doctype.label;
  end if;

  -- Update document
  update app.erp_documents
  set data = v_new_data, title = v_title, updated_by = auth.uid(), updated_at = now()
  where id = p_document_id;

  -- Write version history
  select coalesce(max(version_number), 0) into v_max_version
  from app.erp_document_versions
  where document_id = p_document_id;

  insert into app.erp_document_versions (document_id, doctype_key, version_number, data, changed_by, docstatus, workflow_state)
  values (p_document_id, p_doctype_key, v_max_version + 1, v_new_data, auth.uid(), v_doc.docstatus, v_doc.workflow_state);

  return jsonb_build_object('ok', true, 'document_id', p_document_id);
end;
$$;

-- ── 5. Restore erp_apply_workflow_action ───────────────────────────────────
-- Must apply: document_matches_user_permission_rules

create or replace function public.erp_apply_workflow_action(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid,
  p_action text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_doc record;
  v_transition record;
  v_new_state text;
  v_new_docstatus int;
  v_old_state text;
  v_old_docstatus int;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped, workflow_key
    into v_doctype
    from app.erp_doctypes
    where doctype_key = p_doctype_key;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'DocType not found');
  end if;

  if v_doctype.storage_strategy != 'generic_json' then
    return jsonb_build_object('ok', false, 'error', 'DocType uses physical_rpc storage');
  end if;

  if v_doctype.workflow_key is null then
    return jsonb_build_object('ok', false, 'error', 'DocType has no workflow');
  end if;

  -- Enforce update permission
  if not public.current_user_has_doctype_permission(p_doctype_key, 'update', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: update access required for workflow actions');
  end if;

  -- Fetch document with record-level permission check
  select d.id, d.docstatus, d.workflow_state, d.is_active, d.data
    into v_doc
    from app.erp_documents d
    where d.id = p_document_id
      and d.doctype_key = p_doctype_key
      and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
      and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'write');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  if not v_doc.is_active then
    return jsonb_build_object('ok', false, 'error', 'Cannot transition an inactive document');
  end if;

  if v_doc.docstatus in (1, 2) then
    return jsonb_build_object('ok', false, 'error', 'Document is ' || case v_doc.docstatus when 1 then 'submitted' when 2 then 'cancelled' end || '; use amend to create a new draft');
  end if;

  v_old_state := coalesce(v_doc.workflow_state, 'draft');
  v_old_docstatus := v_doc.docstatus;

  select * into v_transition
  from app.erp_workflow_transitions t
  where t.workflow_key = v_doctype.workflow_key
    and t.from_state = v_old_state
    and t.action_label = p_action;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid action "' || p_action || '" from state "' || v_old_state || '"');
  end if;

  if v_transition.required_permission_key is not null then
    if not exists (
      select 1
      from app.company_role_assignments cra
      join app.company_roles cr on cra.role_id = cr.id and cr.tenant_id = p_company_id and cr.is_active = true
      join app.company_role_permissions crp on crp.role_id = cr.id and crp.permission_key = v_transition.required_permission_key and crp.is_granted = true
      where cra.user_id = auth.uid() and cra.is_active = true
    ) then
      return jsonb_build_object('ok', false, 'error', 'Permission denied: missing required permission for this transition');
    end if;
  end if;

  v_new_state := v_transition.to_state;

  v_new_docstatus := case
    when v_new_state = 'cancelled' then 2
    else 0
  end;

  update app.erp_documents
  set workflow_state = v_new_state,
      docstatus = v_new_docstatus,
      cancelled_at = case when v_new_docstatus = 2 then now() else cancelled_at end,
      cancelled_by = case when v_new_docstatus = 2 then auth.uid() else cancelled_by end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_document_id;

  insert into app.erp_document_versions (document_id, doctype_key, version_number, data, changed_by, change_reason, docstatus, workflow_state)
  select p_document_id, p_doctype_key,
    (select coalesce(max(version_number), 0) + 1 from app.erp_document_versions where document_id = p_document_id),
    d.data, auth.uid(),
    'workflow: ' || v_old_state || ' → ' || v_new_state || ' (action: ' || p_action || ')',
    v_new_docstatus, v_new_state
  from app.erp_documents d
  where d.id = p_document_id;

  return jsonb_build_object(
    'ok', true,
    'document_id', p_document_id,
    'old_state', v_old_state,
    'new_state', v_new_state,
    'docstatus', v_new_docstatus,
    'action', p_action
  );
end;
$$;

-- ── 6. Restore erp_submit_document ────────────────────────────────────────
-- Must apply: document_matches_user_permission_rules

create or replace function public.erp_submit_document(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_doc record;
  v_max_version int;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped, is_submittable
    into v_doctype
    from app.erp_doctypes
    where doctype_key = p_doctype_key;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'DocType not found');
  end if;

  if not v_doctype.is_submittable then
    return jsonb_build_object('ok', false, 'error', 'DocType is not submittable');
  end if;

  if v_doctype.storage_strategy != 'generic_json' then
    return jsonb_build_object('ok', false, 'error', 'DocType uses physical_rpc storage');
  end if;

  if not public.current_user_has_doctype_permission(p_doctype_key, 'update', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  select d.id, d.docstatus, d.data
    into v_doc
    from app.erp_documents d
    where d.id = p_document_id
      and d.doctype_key = p_doctype_key
      and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
      and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'write');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  if v_doc.docstatus != 0 then
    return jsonb_build_object('ok', false, 'error', 'Only draft documents (docstatus=0) can be submitted');
  end if;

  update app.erp_documents
  set docstatus = 1, submitted_at = now(), submitted_by = auth.uid(), updated_by = auth.uid(), updated_at = now()
  where id = p_document_id;

  select coalesce(max(version_number), 0) into v_max_version
  from app.erp_document_versions where document_id = p_document_id;

  insert into app.erp_document_versions (document_id, doctype_key, version_number, data, changed_by, change_reason, docstatus, workflow_state)
  select p_document_id, p_doctype_key, v_max_version + 1, d.data, auth.uid(), 'submit', 1, d.workflow_state
  from app.erp_documents d where d.id = p_document_id;

  return jsonb_build_object('ok', true, 'document_id', p_document_id, 'docstatus', 1);
end;
$$;

-- ── 7. Restore erp_cancel_document ────────────────────────────────────────
-- Must apply: document_matches_user_permission_rules

create or replace function public.erp_cancel_document(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_doc record;
  v_max_version int;
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
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  select d.id, d.docstatus, d.data
    into v_doc
    from app.erp_documents d
    where d.id = p_document_id
      and d.doctype_key = p_doctype_key
      and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
      and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'write');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  if v_doc.docstatus = 2 then
    return jsonb_build_object('ok', false, 'error', 'Document is already cancelled');
  end if;

  update app.erp_documents
  set docstatus = 2, workflow_state = 'cancelled',
      cancelled_at = now(), cancelled_by = auth.uid(),
      updated_by = auth.uid(), updated_at = now()
  where id = p_document_id;

  select coalesce(max(version_number), 0) into v_max_version
  from app.erp_document_versions where document_id = p_document_id;

  insert into app.erp_document_versions (document_id, doctype_key, version_number, data, changed_by, change_reason, docstatus, workflow_state)
  select p_document_id, p_doctype_key, v_max_version + 1, d.data, auth.uid(), 'cancel', 2, 'cancelled'
  from app.erp_documents d where d.id = p_document_id;

  return jsonb_build_object('ok', true, 'document_id', p_document_id, 'docstatus', 2);
end;
$$;

-- ── 8. Restore erp_list_workflow_actions ───────────────────────────────────
-- Must apply: document_matches_user_permission_rules

create or replace function public.erp_list_workflow_actions(
  p_doctype_key text,
  p_document_id uuid,
  p_company_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doctype record;
  v_doc record;
  v_workflow record;
  v_current_state text;
  v_result jsonb;
begin
  select doctype_key, is_active, storage_strategy, is_company_scoped, workflow_key
    into v_doctype
    from app.erp_doctypes
    where doctype_key = p_doctype_key;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'DocType not found');
  end if;

  if v_doctype.storage_strategy != 'generic_json' then
    return jsonb_build_object('ok', false, 'error', 'DocType uses physical_rpc storage');
  end if;

  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  if v_doctype.workflow_key is null then
    return jsonb_build_object('ok', true, 'data', '[]'::jsonb, 'workflow_key', null);
  end if;

  select * into v_workflow
  from app.erp_workflows w
  where w.workflow_key = v_doctype.workflow_key
    and w.is_active = true;

  if not found then
    return jsonb_build_object('ok', true, 'data', '[]'::jsonb, 'workflow_key', v_doctype.workflow_key);
  end if;

  -- Fetch document with record-level permission check
  select d.docstatus, d.workflow_state
    into v_doc
    from app.erp_documents d
    where d.id = p_document_id
      and d.doctype_key = p_doctype_key
      and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
      and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'read');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  v_current_state := coalesce(v_doc.workflow_state, 'draft');

  select jsonb_agg(
    jsonb_build_object(
      'action', t.action_label,
      'from_state', t.from_state,
      'to_state', t.to_state,
      'required_permission_key', t.required_permission_key,
      'allowed', public.current_user_has_doctype_permission(p_doctype_key, 'update', p_company_id)
        and (
          t.required_permission_key is null
          or exists (
            select 1
            from app.company_role_assignments cra
            join app.company_roles cr on cra.role_id = cr.id and cr.tenant_id = p_company_id and cr.is_active = true
            join app.company_role_permissions crp on crp.role_id = cr.id and crp.permission_key = t.required_permission_key and crp.is_granted = true
            where cra.user_id = auth.uid() and cra.is_active = true
          )
        )
    )
  ) into v_result
  from app.erp_workflow_transitions t
  where t.workflow_key = v_doctype.workflow_key
    and t.from_state = v_current_state;

  return jsonb_build_object(
    'ok', true,
    'data', coalesce(v_result, '[]'::jsonb),
    'workflow_key', v_doctype.workflow_key,
    'current_state', v_current_state,
    'docstatus', v_doc.docstatus
  );
end;
$$;
