-- 0026_custom_doctype_storage.sql
-- Phase 2.8: Generic Custom DocType Document Storage
-- Schema: app (new tables), public (RPC functions)
--
-- 1. Add storage_strategy to erp_doctypes
-- 2. Create erp_documents + erp_document_versions tables
-- 3. RLS on new tables (no direct frontend writes)
-- 4. Permission helper for doctype-specific action checks
-- 5. Safe RPC functions for generic document CRUD

-- ── 1. storage_strategy column ───────────────────────────────────────────────

alter table app.erp_doctypes add column if not exists storage_strategy text not null default 'physical_rpc'
  check (storage_strategy in ('physical_rpc', 'generic_json'));

-- Existing seeded DocTypes all use physical_rpc (no change needed)

-- ── 2. erp_documents table ───────────────────────────────────────────────────

create table if not exists app.erp_documents (
  id uuid primary key default gen_random_uuid(),
  doctype_key text not null references app.erp_doctypes(doctype_key),
  company_id uuid references app.tenants(id),
  document_number text,
  title text,
  data jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_erp_documents_doctype on app.erp_documents(doctype_key);
create index if not exists idx_erp_documents_company on app.erp_documents(company_id);
create index if not exists idx_erp_documents_active on app.erp_documents(is_active);

-- ── 3. erp_document_versions table ───────────────────────────────────────────

create table if not exists app.erp_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references app.erp_documents(id) on delete cascade,
  doctype_key text not null,
  version_number int not null,
  data jsonb not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  change_reason text
);

create index if not exists idx_erp_doc_versions_doc on app.erp_document_versions(document_id);

-- ── 4. RLS on erp_documents ──────────────────────────────────────────────────

alter table app.erp_documents enable row level security;
alter table app.erp_document_versions enable row level security;

-- No direct frontend reads — only through RPC
drop policy if exists erp_documents_select on app.erp_documents;
create policy erp_documents_select on app.erp_documents for select
  to authenticated using (false);

drop policy if exists erp_documents_insert on app.erp_documents;
create policy erp_documents_insert on app.erp_documents for insert
  to authenticated with check (false);

drop policy if exists erp_documents_update on app.erp_documents;
create policy erp_documents_update on app.erp_documents for update
  to authenticated using (false) with check (false);

drop policy if exists erp_documents_delete on app.erp_documents;
create policy erp_documents_delete on app.erp_documents for delete
  to authenticated using (false);

-- Service role bypasses RLS when called from SECURITY DEFINER RPC
-- No direct frontend access to erp_document_versions either
drop policy if exists erp_doc_versions_select on app.erp_document_versions;
create policy erp_doc_versions_select on app.erp_document_versions for select
  to authenticated using (false);

drop policy if exists erp_doc_versions_insert on app.erp_document_versions;
create policy erp_doc_versions_insert on app.erp_document_versions for insert
  to authenticated with check (false);

drop policy if exists erp_doc_versions_update on app.erp_document_versions;
create policy erp_doc_versions_update on app.erp_document_versions for update
  to authenticated using (false) with check (false);

drop policy if exists erp_doc_versions_delete on app.erp_document_versions;
create policy erp_doc_versions_delete on app.erp_document_versions for delete
  to authenticated using (false);

-- ── 5. Permission helper for doctype-specific action checks ──────────────────

create or replace function public.current_user_has_doctype_permission(
  p_doctype_key text,
  p_action_key text,
  p_company_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.erp_doctype_actions da
    join app.company_role_assignments cra on cra.is_active = true
    join app.company_roles cr on cra.role_id = cr.id and cr.tenant_id = p_company_id and cr.is_active = true
    join app.company_role_permissions crp on crp.role_id = cr.id and crp.permission_key = da.permission_key and crp.is_granted = true
    where da.doctype_key = p_doctype_key
      and da.action_key = p_action_key
      and cra.user_id = auth.uid()
      and cra.is_active = true
  );
$$;

-- ── 6. RPC: list documents ───────────────────────────────────────────────────

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
  -- Validate doctype exists, is active, and uses generic_json
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

  -- Check read permission
  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: read access required');
  end if;

  -- List documents (active only for list, support inactive via explicit get)
  select jsonb_agg(
    jsonb_build_object(
      'id', d.id,
      'document_number', d.document_number,
      'title', d.title,
      'data', d.data,
      'is_active', d.is_active,
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

-- ── 7. RPC: get single document ──────────────────────────────────────────────

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

  select * into v_doc
  from app.erp_documents d
  where d.id = p_document_id
    and d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  return jsonb_build_object('ok', true, 'data', to_jsonb(v_doc));
end;
$$;

-- ── 8. RPC: create document ──────────────────────────────────────────────────

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
begin
  -- Validate doctype
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

  -- Check create permission
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

    -- Check required fields
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

  -- Reject unknown fields (not in erp_docfields)
  for v_fieldname, v_value in select * from jsonb_each_text(p_data)
  loop
    if not exists (select 1 from app.erp_docfields where doctype_key = p_doctype_key and fieldname = v_fieldname) then
      return jsonb_build_object('ok', false, 'error', 'Unknown field: ' || v_fieldname);
    end if;
  end loop;

  -- Extract title from data (use 'title' field, or 'name', or first text field, or doctype label)
  v_title := p_data->>'title';
  if v_title is null or v_title = '' then
    v_title := p_data->>'name';
  end if;
  if v_title is null or v_title = '' then
    v_title := v_doctype.label;
  end if;

  -- Insert document
  insert into app.erp_documents (doctype_key, company_id, title, data, created_by, updated_by)
  values (p_doctype_key, p_company_id, v_title, p_data, auth.uid(), auth.uid())
  returning id into v_doc_id;

  -- Write initial version
  insert into app.erp_document_versions (document_id, doctype_key, version_number, data, changed_by)
  values (v_doc_id, p_doctype_key, 1, p_data, auth.uid());

  return jsonb_build_object('ok', true, 'document_id', v_doc_id);
end;
$$;

-- ── 9. RPC: update document ──────────────────────────────────────────────────

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
begin
  -- Validate doctype
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

  -- Check update permission
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

    if v_is_required and p_data ? v_fieldname then
      v_value := p_data->>v_fieldname;
      if v_value is null or v_value = '' then
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

  -- Merge old and new data (p_data contains only changed fields)
  v_old_data := v_doc.data;
  v_new_data := v_old_data || p_data;

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

  insert into app.erp_document_versions (document_id, doctype_key, version_number, data, changed_by)
  values (p_document_id, p_doctype_key, v_max_version + 1, v_new_data, auth.uid());

  return jsonb_build_object('ok', true, 'document_id', p_document_id);
end;
$$;

-- ── 10. RPC: deactivate (soft delete) document ───────────────────────────────

create or replace function public.erp_deactivate_document(
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

  update app.erp_documents
  set is_active = false, updated_by = auth.uid(), updated_at = now()
  where id = p_document_id
    and doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  return jsonb_build_object('ok', true, 'document_id', p_document_id);
end;
$$;

-- ── 11. Helper: reactivate document ──────────────────────────────────────────

create or replace function public.erp_reactivate_document(
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

  update app.erp_documents
  set is_active = true, updated_by = auth.uid(), updated_at = now()
  where id = p_document_id
    and doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or company_id = p_company_id);

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  return jsonb_build_object('ok', true, 'document_id', p_document_id);
end;
$$;

-- ── 12. Helper: row_to_jsonb (used by erp_get_document) ──────────────────────

create or replace function public.row_to_jsonb(r record)
returns jsonb
language plpgsql
stable
as $$
begin
  return to_jsonb(r);
end;
$$;

-- ── Grant execute permissions ────────────────────────────────────────────────

grant execute on function public.erp_list_documents(text, uuid) to authenticated;
grant execute on function public.erp_get_document(text, uuid, uuid) to authenticated;
grant execute on function public.erp_create_document(text, uuid, jsonb) to authenticated;
grant execute on function public.erp_update_document(text, uuid, uuid, jsonb) to authenticated;
grant execute on function public.erp_deactivate_document(text, uuid, uuid) to authenticated;
grant execute on function public.erp_reactivate_document(text, uuid, uuid) to authenticated;
grant execute on function public.current_user_has_doctype_permission(text, text, uuid) to authenticated;

-- ── Seed: update existing DocTypes to physical_rpc ───────────────────────────

update app.erp_doctypes
set storage_strategy = 'physical_rpc'
where storage_strategy is null or storage_strategy = 'physical_rpc';
