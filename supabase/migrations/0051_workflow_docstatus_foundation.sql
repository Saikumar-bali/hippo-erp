-- 0051_workflow_docstatus_foundation.sql
-- Phase 6.7: Workflow / DocStatus Foundation
--
-- Adds Frappe-style workflow and document status support for metadata-driven
-- generic_json DocTypes. CRM Lead is the proof DocType.
--
-- Backend enforces transitions; frontend buttons are UX only.

-- ── 1. Add docstatus + workflow_state to erp_documents ─────────────────────

alter table app.erp_documents add column if not exists docstatus int not null default 0
  check (docstatus in (0, 1, 2));
alter table app.erp_documents add column if not exists workflow_state text;
alter table app.erp_documents add column if not exists submitted_at timestamptz;
alter table app.erp_documents add column if not exists submitted_by uuid;
alter table app.erp_documents add column if not exists cancelled_at timestamptz;
alter table app.erp_documents add column if not exists cancelled_by uuid;
alter table app.erp_documents add column if not exists amend_count int not null default 0;

-- ── 2. Add workflow_key FK to erp_doctypes ─────────────────────────────────

alter table app.erp_doctypes add column if not exists workflow_key text;

-- ── 3. Add docstatus/workflow_state to erp_document_versions ───────────────

alter table app.erp_document_versions add column if not exists docstatus int;
alter table app.erp_document_versions add column if not exists workflow_state text;

-- ── 4. Seed CRM Lead workflow ──────────────────────────────────────────────

insert into app.erp_workflows (workflow_key, doctype_key, label, is_active)
values ('crm_lead_workflow', 'crm_lead', 'CRM Lead Workflow', true)
on conflict (workflow_key) do update
set doctype_key = excluded.doctype_key, label = excluded.label, is_active = true;

insert into app.erp_workflow_states (workflow_key, state_key, label, sort_order)
values
  ('crm_lead_workflow', 'draft', 'Draft', 10),
  ('crm_lead_workflow', 'open', 'Open', 20),
  ('crm_lead_workflow', 'qualified', 'Qualified', 30),
  ('crm_lead_workflow', 'lost', 'Lost', 40),
  ('crm_lead_workflow', 'converted', 'Converted', 50),
  ('crm_lead_workflow', 'cancelled', 'Cancelled', 60)
on conflict (workflow_key, state_key) do update
set label = excluded.label, sort_order = excluded.sort_order;

insert into app.erp_workflow_transitions (workflow_key, from_state, to_state, action_label, required_permission_key, created_at)
values
  ('crm_lead_workflow', 'draft', 'open', 'Open', 'update_crm_lead', now()),
  ('crm_lead_workflow', 'open', 'qualified', 'Qualify', 'update_crm_lead', now()),
  ('crm_lead_workflow', 'open', 'lost', 'Mark Lost', 'update_crm_lead', now()),
  ('crm_lead_workflow', 'qualified', 'lost', 'Mark Lost', 'update_crm_lead', now()),
  ('crm_lead_workflow', 'open', 'converted', 'Convert', 'update_crm_lead', now()),
  ('crm_lead_workflow', 'qualified', 'converted', 'Convert', 'update_crm_lead', now()),
  ('crm_lead_workflow', 'draft', 'cancelled', 'Cancel', 'update_crm_lead', now()),
  ('crm_lead_workflow', 'open', 'cancelled', 'Cancel', 'update_crm_lead', now()),
  ('crm_lead_workflow', 'qualified', 'cancelled', 'Cancel', 'update_crm_lead', now())
on conflict do nothing;

-- Set CRM Lead to use this workflow
update app.erp_doctypes set workflow_key = 'crm_lead_workflow' where doctype_key = 'crm_lead';

-- ── 5. RPC: get workflow for doctype ───────────────────────────────────────

create or replace function public.erp_get_workflow_for_doctype(
  p_doctype_key text
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_workflow record;
  v_states jsonb;
  v_transitions jsonb;
begin
  select w.workflow_key, w.label, w.is_active, w.doctype_key
    into v_workflow
    from app.erp_workflows w
    where w.doctype_key = p_doctype_key
      and w.is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'No active workflow for DocType: ' || p_doctype_key);
  end if;

  select jsonb_agg(
    jsonb_build_object('state_key', s.state_key, 'label', s.label, 'sort_order', s.sort_order)
    order by s.sort_order
  ) into v_states
  from app.erp_workflow_states s
  where s.workflow_key = v_workflow.workflow_key;

  select jsonb_agg(
    jsonb_build_object(
      'from_state', t.from_state,
      'to_state', t.to_state,
      'action_label', t.action_label,
      'required_permission_key', t.required_permission_key
    )
  ) into v_transitions
  from app.erp_workflow_transitions t
  where t.workflow_key = v_workflow.workflow_key;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'workflow_key', v_workflow.workflow_key,
      'doctype_key', v_workflow.doctype_key,
      'label', v_workflow.label,
      'states', coalesce(v_states, '[]'::jsonb),
      'transitions', coalesce(v_transitions, '[]'::jsonb)
    )
  );
end;
$$;

-- ── 6. RPC: list allowed workflow actions for a document ───────────────────

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

  select d.docstatus, d.workflow_state
    into v_doc
    from app.erp_documents d
    where d.id = p_document_id
      and d.doctype_key = p_doctype_key
      and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

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

-- ── 7. RPC: apply workflow action ──────────────────────────────────────────

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

  -- Enforce update permission (workflow actions require update)
  if not public.current_user_has_doctype_permission(p_doctype_key, 'update', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: update access required for workflow actions');
  end if;

  -- Fetch document
  select d.id, d.docstatus, d.workflow_state, d.is_active
    into v_doc
    from app.erp_documents d
    where d.id = p_document_id
      and d.doctype_key = p_doctype_key
      and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  if not v_doc.is_active then
    return jsonb_build_object('ok', false, 'error', 'Cannot transition an inactive document');
  end if;

  -- Cannot transition submitted or cancelled documents via normal workflow
  if v_doc.docstatus in (1, 2) then
    return jsonb_build_object('ok', false, 'error', 'Document is ' || case v_doc.docstatus when 1 then 'submitted' when 2 then 'cancelled' end || '; use amend to create a new draft');
  end if;

  v_old_state := coalesce(v_doc.workflow_state, 'draft');
  v_old_docstatus := v_doc.docstatus;

  -- Find matching transition
  select * into v_transition
  from app.erp_workflow_transitions t
  where t.workflow_key = v_doctype.workflow_key
    and t.from_state = v_old_state
    and t.action_label = p_action;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invalid action "' || p_action || '" from state "' || v_old_state || '"');
  end if;

  -- Enforce permission-based transition
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

  -- Map terminal states to docstatus
  v_new_docstatus := case
    when v_new_state = 'cancelled' then 2
    else 0  -- all non-cancelled workflow states remain docstatus 0 (draft)
  end;

  -- Update document
  update app.erp_documents
  set workflow_state = v_new_state,
      docstatus = v_new_docstatus,
      cancelled_at = case when v_new_docstatus = 2 then now() else cancelled_at end,
      cancelled_by = case when v_new_docstatus = 2 then auth.uid() else cancelled_by end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_document_id;

  -- Record version
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

-- ── 8. RPC: submit document (explicit submit for submittable DocTypes) ─────

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

  select * into v_doc
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

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

-- ── 9. RPC: cancel document ────────────────────────────────────────────────

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

  select * into v_doc
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

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

-- ── 10. Update erp_list_documents to include docstatus/workflow_state ──────

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
      'data', d.data,
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
    and d.is_active = true;

  return jsonb_build_object('ok', true, 'data', coalesce(v_result, '[]'::jsonb));
end;
$$;

-- ── 11. Update erp_get_document to include docstatus/workflow_state ────────

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
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

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
      'data', v_doc.data,
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

-- ── 12. Update erp_create_document to set initial workflow_state ───────────

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

  -- Validate fields against erp_docfields
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

  -- Reject unknown fields
  for v_fieldname, v_value in select * from jsonb_each_text(p_data)
  loop
    if not exists (select 1 from app.erp_docfields where doctype_key = p_doctype_key and fieldname = v_fieldname) then
      return jsonb_build_object('ok', false, 'error', 'Unknown field: ' || v_fieldname);
    end if;
  end loop;

  -- Extract title
  v_title := p_data->>'title';
  if v_title is null or v_title = '' then
    v_title := p_data->>'name';
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

-- ── 13. Update erp_update_document to enforce docstatus rules ──────────────

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

  -- Fetch existing document
  select * into v_doc
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  -- Enforce docstatus rules: only draft (docstatus=0) documents can be updated
  if v_doc.docstatus != 0 then
    return jsonb_build_object('ok', false, 'error', 'Cannot update: document is ' ||
      case v_doc.docstatus when 1 then 'submitted' when 2 then 'cancelled' end ||
      ' (docstatus=' || v_doc.docstatus || '). Use amend to create a new draft.');
  end if;

  -- Strip docstatus and workflow_state from update payload (backend-only)
  v_clean_data := p_data - 'docstatus' - 'workflow_state' - 'submitted_at' - 'submitted_by' - 'cancelled_at' - 'cancelled_by' - 'amend_count';

  -- Validate fields
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

  -- Reject unknown fields
  for v_fieldname, v_value in select * from jsonb_each_text(v_clean_data)
  loop
    if not exists (select 1 from app.erp_docfields where doctype_key = p_doctype_key and fieldname = v_fieldname) then
      return jsonb_build_object('ok', false, 'error', 'Unknown field: ' || v_fieldname);
    end if;
  end loop;

  -- Merge old and new data
  v_old_data := v_doc.data;
  v_new_data := v_old_data || v_clean_data;

  v_title := v_new_data->>'title';
  if v_title is null or v_title = '' then
    v_title := v_new_data->>'name';
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

-- ── 14. Add submit/cancel actions to erp_doctype_actions for CRM Lead ─────

insert into app.erp_doctype_actions (doctype_key, action_key, permission_key)
values
  ('crm_lead', 'submit', 'update_crm_lead'),
  ('crm_lead', 'cancel', 'update_crm_lead')
on conflict (doctype_key, action_key) do nothing;

-- ── 15. Grant execute permissions ──────────────────────────────────────────

grant execute on function public.erp_get_workflow_for_doctype(text) to authenticated;
grant execute on function public.erp_list_workflow_actions(text, uuid, uuid) to authenticated;
grant execute on function public.erp_apply_workflow_action(text, uuid, uuid, text) to authenticated;
grant execute on function public.erp_submit_document(text, uuid, uuid) to authenticated;
grant execute on function public.erp_cancel_document(text, uuid, uuid) to authenticated;
