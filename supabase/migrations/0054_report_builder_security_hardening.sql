-- 0054_report_builder_security_hardening.sql
-- Phase 6.8.1: Report Builder Security and Evidence Gate
--
-- Hardens report tables and RPCs to prevent permission bypass.
-- 1. RLS: restrict direct table writes to owner/admin via RPC only
-- 2. RPCs: add view_reports gate, owner/admin checks for mutations
-- 3. Field-level permlevel enforcement on report column definitions
-- 4. GRANT EXECUTE to authenticated for all report RPCs

-- ── 1. Helper: check if current user has a permission key for a company ─────

create or replace function public.current_user_has_report_permission(
  p_company_id uuid,
  p_permission_key text
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app.company_role_assignments cra
    join app.company_roles cr on cra.role_id = cr.id
      and cr.tenant_id = p_company_id
      and cr.is_active = true
    join app.company_role_permissions crp on crp.role_id = cr.id
      and crp.permission_key = p_permission_key
      and crp.is_granted = true
    where cra.user_id = auth.uid()
      and cra.is_active = true
  );
$$;

-- ── 2. RLS hardening: drop permissive write policies, replace with safe ones ─

-- Drop the overly permissive authenticated write policies
drop policy if exists "erp_reports_auth_insert" on app.erp_reports;
drop policy if exists "erp_reports_auth_update" on app.erp_reports;
drop policy if exists "erp_reports_auth_delete" on app.erp_reports;
drop policy if exists "erp_report_columns_auth_insert" on app.erp_report_columns;
drop policy if exists "erp_report_columns_auth_update" on app.erp_report_columns;
drop policy if exists "erp_report_columns_auth_delete" on app.erp_report_columns;
drop policy if exists "erp_report_filters_auth_insert" on app.erp_report_filters;
drop policy if exists "erp_report_filters_auth_update" on app.erp_report_filters;
drop policy if exists "erp_report_filters_auth_delete" on app.erp_report_filters;

-- New write policies: require company membership + owner/admin role
-- These protect against direct table writes bypassing RPCs

create policy "erp_reports_owner_insert" on app.erp_reports
  for insert with check (
    auth.role() = 'authenticated'
    and app.current_user_has_tenant_role(company_id, array['owner','admin'])
  );

create policy "erp_reports_owner_update" on app.erp_reports
  for update using (
    auth.role() = 'authenticated'
    and app.current_user_has_tenant_role(company_id, array['owner','admin'])
  );

create policy "erp_reports_owner_delete" on app.erp_reports
  for delete using (
    auth.role() = 'authenticated'
    and app.current_user_has_tenant_role(company_id, array['owner','admin'])
  );

-- Columns and filters: require membership in the parent report's company + owner/admin
create policy "erp_report_columns_owner_insert" on app.erp_report_columns
  for insert with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from app.erp_reports r
      where r.id = erp_report_columns.report_id
        and app.current_user_has_tenant_role(r.company_id, array['owner','admin'])
    )
  );

create policy "erp_report_columns_owner_update" on app.erp_report_columns
  for update using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from app.erp_reports r
      where r.id = erp_report_columns.report_id
        and app.current_user_has_tenant_role(r.company_id, array['owner','admin'])
    )
  );

create policy "erp_report_columns_owner_delete" on app.erp_report_columns
  for delete using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from app.erp_reports r
      where r.id = erp_report_columns.report_id
        and app.current_user_has_tenant_role(r.company_id, array['owner','admin'])
    )
  );

create policy "erp_report_filters_owner_insert" on app.erp_report_filters
  for insert with check (
    auth.role() = 'authenticated'
    and exists (
      select 1 from app.erp_reports r
      where r.id = erp_report_filters.report_id
        and app.current_user_has_tenant_role(r.company_id, array['owner','admin'])
    )
  );

create policy "erp_report_filters_owner_update" on app.erp_report_filters
  for update using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from app.erp_reports r
      where r.id = erp_report_filters.report_id
        and app.current_user_has_tenant_role(r.company_id, array['owner','admin'])
    )
  );

create policy "erp_report_filters_owner_delete" on app.erp_report_filters
  for delete using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from app.erp_reports r
      where r.id = erp_report_filters.report_id
        and app.current_user_has_tenant_role(r.company_id, array['owner','admin'])
    )
  );

-- ── 3. RPC hardening ────────────────────────────────────────────────────────

-- ── erp_list_reports: add view_reports gate ──────────────────────────────────

create or replace function public.erp_list_reports(
  p_company_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  -- Gate: must have view_reports permission
  if not public.current_user_has_report_permission(p_company_id, 'view_reports') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: view_reports required');
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'report_key', r.report_key,
      'report_name', r.report_name,
      'doctype_key', r.doctype_key,
      'report_type', r.report_type,
      'is_standard', r.is_standard,
      'is_active', r.is_active,
      'created_at', r.created_at
    ) order by r.report_name
  ) into v_result
  from app.erp_reports r
  where r.company_id = p_company_id
    and r.is_active = true
    and public.current_user_has_doctype_permission(r.doctype_key, 'read', p_company_id);

  return jsonb_build_object('ok', true, 'data', coalesce(v_result, '[]'::jsonb));
end;
$$;

-- ── erp_get_report_definition: filter columns by permlevel ───────────────────

create or replace function public.erp_get_report_definition(
  p_report_id uuid,
  p_company_id uuid
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_report record;
  v_columns jsonb;
  v_filters jsonb;
begin
  -- Gate: must have view_reports permission
  if not public.current_user_has_report_permission(p_company_id, 'view_reports') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: view_reports required');
  end if;

  select * into v_report
  from app.erp_reports r
  where r.id = p_report_id
    and r.company_id = p_company_id
    and r.is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Report not found');
  end if;

  if not public.current_user_has_doctype_permission(v_report.doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: read access required for this DocType');
  end if;

  -- Return columns, but only those the user can read (filtered by permlevel)
  select jsonb_agg(
    jsonb_build_object(
      'fieldname', c.fieldname,
      'label', c.label,
      'fieldtype', c.fieldtype,
      'order_index', c.order_index,
      'width', c.width,
      'is_visible', c.is_visible,
      'aggregation', c.aggregation
    ) order by c.order_index
  ) into v_columns
  from app.erp_report_columns c
  where c.report_id = p_report_id
    and (
      c.is_visible = false
      or public.filter_document_data_by_user_access(
        auth.uid(), p_company_id, v_report.doctype_key,
        jsonb_build_object(c.fieldname, null)
      ) ? c.fieldname
    );

  select jsonb_agg(
    jsonb_build_object(
      'fieldname', f.fieldname,
      'operator', f.operator,
      'default_value', f.default_value,
      'is_required', f.is_required,
      'order_index', f.order_index
    ) order by f.order_index
  ) into v_filters
  from app.erp_report_filters f
  where f.report_id = p_report_id;

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'id', v_report.id,
      'report_key', v_report.report_key,
      'report_name', v_report.report_name,
      'doctype_key', v_report.doctype_key,
      'report_type', v_report.report_type,
      'is_standard', v_report.is_standard,
      'columns', coalesce(v_columns, '[]'::jsonb),
      'filters', coalesce(v_filters, '[]'::jsonb)
    )
  );
end;
$$;

-- ── erp_run_report: add view_reports gate + in operator ─────────────────────

create or replace function public.erp_run_report(
  p_report_id uuid,
  p_company_id uuid,
  p_filters jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report record;
  v_column record;
  v_doc record;
  v_rows jsonb := '[]'::jsonb;
  v_row jsonb;
  v_filtered_data jsonb;
  v_filter record;
  v_filter_value text;
  v_where_extra text := '';
  v_count integer := 0;
  v_max_rows integer := 500;
  v_query text;
begin
  -- Gate: must have view_reports permission
  if not public.current_user_has_report_permission(p_company_id, 'view_reports') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: view_reports required');
  end if;

  -- 1. Load report definition
  select * into v_report
  from app.erp_reports r
  where r.id = p_report_id
    and r.company_id = p_company_id
    and r.is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Report not found');
  end if;

  -- 2. Check DocType read permission
  if not public.current_user_has_doctype_permission(v_report.doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: read access required for ' || v_report.doctype_key);
  end if;

  -- 3. Build filter conditions from user-provided filters
  -- These are applied AFTER permission filtering to prevent bypass
  for v_filter in
    select rf.fieldname, rf.operator
    from app.erp_report_filters rf
    where rf.report_id = p_report_id
      and p_filters ? rf.fieldname
  loop
    v_filter_value := p_filters ->> v_filter.fieldname;
    if v_filter_value is not null and v_filter_value != '' then
      case v_filter.operator
        when 'eq' then v_where_extra := v_where_extra || format(' and (d.data ->> %L) = %L', v_filter.fieldname, v_filter_value);
        when 'ne' then v_where_extra := v_where_extra || format(' and (d.data ->> %L) != %L', v_filter.fieldname, v_filter_value);
        when 'contains' then v_where_extra := v_where_extra || format(' and (d.data ->> %L) ilike %L', v_filter.fieldname, '%' || v_filter_value || '%');
        when 'gt' then v_where_extra := v_where_extra || format(' and (d.data ->> %L) > %L', v_filter.fieldname, v_filter_value);
        when 'gte' then v_where_extra := v_where_extra || format(' and (d.data ->> %L) >= %L', v_filter.fieldname, v_filter_value);
        when 'lt' then v_where_extra := v_where_extra || format(' and (d.data ->> %L) < %L', v_filter.fieldname, v_filter_value);
        when 'lte' then v_where_extra := v_where_extra || format(' and (d.data ->> %L) <= %L', v_filter.fieldname, v_filter_value);
        when 'in' then v_where_extra := v_where_extra || format(' and (d.data ->> %L) = any(string_to_array(%L, '',''))', v_filter.fieldname, v_filter_value);
        when 'is_null' then v_where_extra := v_where_extra || format(' and (d.data ->> %L) is null', v_filter.fieldname);
        else null;
      end case;
    end if;
  end loop;

  -- 4. Build and execute the query
  v_query := format(
    'select d.id, d.data, d.docstatus, d.workflow_state, d.created_at
     from app.erp_documents d
     where d.doctype_key = %L
       and d.company_id = %L
       and d.is_active = true
       and public.document_matches_user_permission_rules(auth.uid(), %L, %L, d.data, %L)
       %s
     order by d.created_at desc
     limit %s',
    v_report.doctype_key,
    p_company_id,
    p_company_id,
    v_report.doctype_key,
    'read',
    v_where_extra,
    v_max_rows
  );

  for v_doc in execute v_query
  loop
    -- Apply field-level masking
    v_filtered_data := public.filter_document_data_by_user_access(
      auth.uid(), p_company_id, v_report.doctype_key, v_doc.data
    );

    -- Build row with only report-defined columns that user can read
    v_row := jsonb_build_object(
      'id', v_doc.id,
      'docstatus', v_doc.docstatus,
      'workflow_state', v_doc.workflow_state,
      'created_at', v_doc.created_at
    );

    for v_column in
      select c.fieldname, c.label
      from app.erp_report_columns c
      where c.report_id = p_report_id
        and c.is_visible = true
    loop
      -- Only include fields that exist in the masked data (respects permlevel)
      if v_filtered_data ? v_column.fieldname then
        v_row := v_row || jsonb_build_object(v_column.fieldname, v_filtered_data -> v_column.fieldname);
      end if;
    end loop;

    v_rows := v_rows || jsonb_build_array(v_row);
    v_count := v_count + 1;
  end loop;

  -- 5. Build column metadata for frontend (only columns user can read)
  select jsonb_agg(
    jsonb_build_object(
      'fieldname', c.fieldname,
      'label', c.label,
      'fieldtype', c.fieldtype,
      'width', c.width,
      'aggregation', c.aggregation
    ) order by c.order_index
  ) into v_filtered_data
  from app.erp_report_columns c
  where c.report_id = p_report_id
    and c.is_visible = true
    and public.filter_document_data_by_user_access(
      auth.uid(), p_company_id, v_report.doctype_key,
      jsonb_build_object(c.fieldname, null)
    ) ? c.fieldname;

  return jsonb_build_object(
    'ok', true,
    'data', v_rows,
    'columns', coalesce(v_filtered_data, '[]'::jsonb),
    'row_count', v_count,
    'truncated', v_count >= v_max_rows
  );
end;
$$;

-- ── erp_create_report: require owner/admin ───────────────────────────────────

create or replace function public.erp_create_report(
  p_company_id uuid,
  p_report_key text,
  p_report_name text,
  p_doctype_key text,
  p_columns jsonb default '[]'::jsonb,
  p_filters jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report_id uuid;
  v_col jsonb;
  v_filt jsonb;
begin
  -- Gate: must be owner/admin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: owner or admin role required');
  end if;

  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: read access required');
  end if;

  -- Check for duplicate report_key
  if exists (select 1 from app.erp_reports where company_id = p_company_id and report_key = p_report_key) then
    return jsonb_build_object('ok', false, 'error', 'Report key already exists: ' || p_report_key);
  end if;

  insert into app.erp_reports (company_id, report_key, report_name, doctype_key, is_standard, is_active, created_by)
  values (p_company_id, p_report_key, p_report_name, p_doctype_key, false, true, auth.uid())
  returning id into v_report_id;

  -- Insert columns
  for v_col in select * from jsonb_array_elements(p_columns)
  loop
    insert into app.erp_report_columns (report_id, fieldname, label, fieldtype, order_index, width, is_visible, aggregation)
    values (
      v_report_id,
      v_col ->> 'fieldname',
      v_col ->> 'label',
      coalesce(v_col ->> 'fieldtype', 'Data'),
      coalesce((v_col ->> 'order_index')::integer, 0),
      (v_col ->> 'width')::integer,
      coalesce((v_col ->> 'is_visible')::boolean, true),
      v_col ->> 'aggregation'
    );
  end loop;

  -- Insert filters
  for v_filt in select * from jsonb_array_elements(p_filters)
  loop
    insert into app.erp_report_filters (report_id, fieldname, operator, default_value, is_required, order_index)
    values (
      v_report_id,
      v_filt ->> 'fieldname',
      coalesce(v_filt ->> 'operator', 'eq'),
      v_filt ->> 'default_value',
      coalesce((v_filt ->> 'is_required')::boolean, false),
      coalesce((v_filt ->> 'order_index')::integer, 0)
    );
  end loop;

  return jsonb_build_object('ok', true, 'report_id', v_report_id);
end;
$$;

-- ── erp_update_report: require owner/admin ───────────────────────────────────

create or replace function public.erp_update_report(
  p_report_id uuid,
  p_company_id uuid,
  p_report_name text default null,
  p_columns jsonb default null,
  p_filters jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report record;
  v_col jsonb;
  v_filt jsonb;
begin
  -- Gate: must be owner/admin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: owner or admin role required');
  end if;

  select * into v_report
  from app.erp_reports r
  where r.id = p_report_id and r.company_id = p_company_id and r.is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Report not found');
  end if;

  if v_report.is_standard then
    return jsonb_build_object('ok', false, 'error', 'Cannot modify standard reports');
  end if;

  if p_report_name is not null then
    update app.erp_reports set report_name = p_report_name, updated_at = now() where id = p_report_id;
  end if;

  -- Replace columns if provided
  if p_columns is not null then
    delete from app.erp_report_columns where report_id = p_report_id;
    for v_col in select * from jsonb_array_elements(p_columns)
    loop
      insert into app.erp_report_columns (report_id, fieldname, label, fieldtype, order_index, width, is_visible, aggregation)
      values (
        p_report_id,
        v_col ->> 'fieldname',
        v_col ->> 'label',
        coalesce(v_col ->> 'fieldtype', 'Data'),
        coalesce((v_col ->> 'order_index')::integer, 0),
        (v_col ->> 'width')::integer,
        coalesce((v_col ->> 'is_visible')::boolean, true),
        v_col ->> 'aggregation'
      );
    end loop;
  end if;

  -- Replace filters if provided
  if p_filters is not null then
    delete from app.erp_report_filters where report_id = p_report_id;
    for v_filt in select * from jsonb_array_elements(p_filters)
    loop
      insert into app.erp_report_filters (report_id, fieldname, operator, default_value, is_required, order_index)
      values (
        p_report_id,
        v_filt ->> 'fieldname',
        coalesce(v_filt ->> 'operator', 'eq'),
        v_filt ->> 'default_value',
        coalesce((v_filt ->> 'is_required')::boolean, false),
        coalesce((v_filt ->> 'order_index')::integer, 0)
      );
    end loop;
  end if;

  update app.erp_reports set updated_at = now() where id = p_report_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ── erp_delete_report: require owner/admin ───────────────────────────────────

create or replace function public.erp_delete_report(
  p_report_id uuid,
  p_company_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report record;
begin
  -- Gate: must be owner/admin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: owner or admin role required');
  end if;

  select * into v_report
  from app.erp_reports r
  where r.id = p_report_id and r.company_id = p_company_id and r.is_active = true;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Report not found');
  end if;

  if v_report.is_standard then
    return jsonb_build_object('ok', false, 'error', 'Cannot delete standard reports');
  end if;

  update app.erp_reports set is_active = false, updated_at = now() where id = p_report_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ── 4. GRANT EXECUTE to authenticated ───────────────────────────────────────

grant execute on function public.erp_list_reports(uuid) to authenticated;
grant execute on function public.erp_get_report_definition(uuid, uuid) to authenticated;
grant execute on function public.erp_run_report(uuid, uuid, jsonb) to authenticated;
grant execute on function public.erp_create_report(uuid, text, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.erp_update_report(uuid, uuid, text, jsonb, jsonb) to authenticated;
grant execute on function public.erp_delete_report(uuid, uuid) to authenticated;
grant execute on function public.current_user_has_report_permission(uuid, text) to authenticated;

-- ── 5. Seed erp_doctype_actions for report CRUD permission checks ───────────

insert into app.erp_doctype_actions (doctype_key, action_key, permission_key) values
('crm_lead', 'read', 'read'),
('crm_lead', 'write', 'write'),
('crm_lead', 'create', 'create'),
('crm_lead', 'delete', 'delete'),
('crm_opportunity', 'read', 'read'),
('crm_opportunity', 'write', 'write'),
('crm_opportunity', 'create', 'create'),
('crm_opportunity', 'delete', 'delete'),
('crm_account', 'read', 'read'),
('crm_account', 'write', 'write'),
('crm_account', 'create', 'create'),
('crm_account', 'delete', 'delete'),
('crm_contact', 'read', 'read'),
('crm_contact', 'write', 'write'),
('crm_contact', 'create', 'create'),
('crm_contact', 'delete', 'delete'),
('crm_followup_task', 'read', 'read'),
('crm_followup_task', 'write', 'write'),
('crm_followup_task', 'create', 'create'),
('crm_followup_task', 'delete', 'delete'),
('product', 'read', 'read'),
('product', 'write', 'write'),
('product', 'create', 'create'),
('product', 'delete', 'delete'),
('vehicle', 'read', 'read'),
('vehicle', 'write', 'write'),
('vehicle', 'create', 'create'),
('vehicle', 'delete', 'delete'),
('warehouse', 'read', 'read'),
('warehouse', 'write', 'write'),
('warehouse', 'create', 'create'),
('warehouse', 'delete', 'delete'),
('store', 'read', 'read'),
('store', 'write', 'write'),
('store', 'create', 'create'),
('store', 'delete', 'delete'),
('purchase_invoice', 'read', 'read'),
('purchase_invoice', 'write', 'write'),
('purchase_invoice', 'create', 'create'),
('purchase_invoice', 'delete', 'delete'),
('Supplier', 'read', 'read'),
('Supplier', 'write', 'write'),
('Supplier', 'create', 'create'),
('Supplier', 'delete', 'delete')
on conflict do nothing;
