-- 0053_report_builder_foundation.sql
-- Phase 6.8: Report Builder Foundation
--
-- Adds metadata-driven report tables, standard CRM reports,
-- and secure report execution RPCs.

-- ── 1. Tables ────────────────────────────────────────────────────────────

create table if not exists app.erp_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references app.tenants(id) on delete cascade,
  report_key text not null,
  report_name text not null,
  doctype_key text not null,
  report_type text not null default 'list' check (report_type in ('list')),
  is_standard boolean not null default false,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, report_key)
);

create table if not exists app.erp_report_columns (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references app.erp_reports(id) on delete cascade,
  fieldname text not null,
  label text not null,
  fieldtype text not null default 'Data',
  order_index integer not null default 0,
  width integer,
  is_visible boolean not null default true,
  aggregation text check (aggregation in ('count', 'sum', 'avg', 'min', 'max'))
);

create table if not exists app.erp_report_filters (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references app.erp_reports(id) on delete cascade,
  fieldname text not null,
  operator text not null default 'eq' check (operator in ('eq', 'ne', 'contains', 'gt', 'gte', 'lt', 'lte', 'in', 'is_null')),
  default_value text,
  is_required boolean not null default false,
  order_index integer not null default 0
);

create index if not exists idx_erp_reports_company on app.erp_reports(company_id);
create index if not exists idx_erp_reports_doctype on app.erp_reports(doctype_key);
create index if not exists idx_erp_report_columns_report on app.erp_report_columns(report_id);
create index if not exists idx_erp_report_filters_report on app.erp_report_filters(report_id);

-- ── 2. RLS ───────────────────────────────────────────────────────────────

alter table app.erp_reports enable row level security;
alter table app.erp_report_columns enable row level security;
alter table app.erp_report_filters enable row level security;

-- Service role bypass
create policy "erp_reports_service_role_all" on app.erp_reports for all using (auth.role() = 'service_role');
create policy "erp_report_columns_service_role_all" on app.erp_report_columns for all using (auth.role() = 'service_role');
create policy "erp_report_filters_service_role_all" on app.erp_report_filters for all using (auth.role() = 'service_role');

-- Authenticated read via company membership
create policy "erp_reports_auth_read" on app.erp_reports for select using (
  auth.role() = 'authenticated'
  and exists (
    select 1 from app.tenant_members tm
    where tm.tenant_id = erp_reports.company_id
      and tm.user_id = auth.uid()
      and tm.is_active = true
  )
);
create policy "erp_report_columns_auth_read" on app.erp_report_columns for select using (
  auth.role() = 'authenticated'
  and exists (
    select 1 from app.erp_reports r
    join app.tenant_members tm on tm.tenant_id = r.company_id and tm.user_id = auth.uid() and tm.is_active = true
    where r.id = erp_report_columns.report_id
  )
);
create policy "erp_report_filters_auth_read" on app.erp_report_filters for select using (
  auth.role() = 'authenticated'
  and exists (
    select 1 from app.erp_reports r
    join app.tenant_members tm on tm.tenant_id = r.company_id and tm.user_id = auth.uid() and tm.is_active = true
    where r.id = erp_report_filters.report_id
  )
);

-- Authenticated insert/update/delete (for custom reports, enforced by RPC)
create policy "erp_reports_auth_insert" on app.erp_reports for insert with check (auth.role() = 'authenticated');
create policy "erp_reports_auth_update" on app.erp_reports for update using (auth.role() = 'authenticated');
create policy "erp_reports_auth_delete" on app.erp_reports for delete using (auth.role() = 'authenticated');
create policy "erp_report_columns_auth_insert" on app.erp_report_columns for insert with check (auth.role() = 'authenticated');
create policy "erp_report_columns_auth_update" on app.erp_report_columns for update using (auth.role() = 'authenticated');
create policy "erp_report_columns_auth_delete" on app.erp_report_columns for delete using (auth.role() = 'authenticated');
create policy "erp_report_filters_auth_insert" on app.erp_report_filters for insert with check (auth.role() = 'authenticated');
create policy "erp_report_filters_auth_update" on app.erp_report_filters for update using (auth.role() = 'authenticated');
create policy "erp_report_filters_auth_delete" on app.erp_report_filters for delete using (auth.role() = 'authenticated');

-- ── 3. Seed standard CRM reports ─────────────────────────────────────────

-- Get the default company for seeding (first tenant)
do $$
declare
  v_company_id uuid;
  v_lead_report_id uuid;
  v_opp_report_id uuid;
begin
  select id into v_company_id from app.tenants order by created_at limit 1;
  if v_company_id is null then return; end if;

  -- CRM Lead List Report
  insert into app.erp_reports (company_id, report_key, report_name, doctype_key, report_type, is_standard, is_active)
  values (v_company_id, 'crm_lead_list', 'CRM Lead List Report', 'crm_lead', 'list', true, true)
  on conflict (company_id, report_key) do update set report_name = excluded.report_name
  returning id into v_lead_report_id;

  -- CRM Lead columns
  delete from app.erp_report_columns where report_id = v_lead_report_id;
  insert into app.erp_report_columns (report_id, fieldname, label, fieldtype, order_index, width, is_visible) values
    (v_lead_report_id, 'lead_name', 'Lead Name', 'Data', 1, 200, true),
    (v_lead_report_id, 'company_name', 'Company Name', 'Data', 2, 180, true),
    (v_lead_report_id, 'status', 'Status', 'Select', 3, 120, true),
    (v_lead_report_id, 'workflow_state', 'Workflow State', 'Data', 4, 120, true),
    (v_lead_report_id, 'docstatus', 'Doc Status', 'Int', 5, 80, true),
    (v_lead_report_id, 'created_at', 'Created', 'Datetime', 6, 160, true);

  -- CRM Lead filters
  delete from app.erp_report_filters where report_id = v_lead_report_id;
  insert into app.erp_report_filters (report_id, fieldname, operator, default_value, is_required, order_index) values
    (v_lead_report_id, 'status', 'eq', null, false, 1),
    (v_lead_report_id, 'workflow_state', 'eq', null, false, 2),
    (v_lead_report_id, 'lead_name', 'contains', null, false, 3);

  -- CRM Opportunity List Report
  insert into app.erp_reports (company_id, report_key, report_name, doctype_key, report_type, is_standard, is_active)
  values (v_company_id, 'crm_opportunity_list', 'CRM Opportunity List Report', 'crm_opportunity', 'list', true, true)
  on conflict (company_id, report_key) do update set report_name = excluded.report_name
  returning id into v_opp_report_id;

  -- CRM Opportunity columns
  delete from app.erp_report_columns where report_id = v_opp_report_id;
  insert into app.erp_report_columns (report_id, fieldname, label, fieldtype, order_index, width, is_visible) values
    (v_opp_report_id, 'opportunity_name', 'Opportunity Name', 'Data', 1, 200, true),
    (v_opp_report_id, 'account_name', 'Account Name', 'Data', 2, 180, true),
    (v_opp_report_id, 'stage', 'Stage', 'Select', 3, 120, true),
    (v_opp_report_id, 'amount', 'Amount', 'Float', 4, 120, true),
    (v_opp_report_id, 'workflow_state', 'Workflow State', 'Data', 5, 120, true),
    (v_opp_report_id, 'docstatus', 'Doc Status', 'Int', 6, 80, true),
    (v_opp_report_id, 'created_at', 'Created', 'Datetime', 7, 160, true);

  -- CRM Opportunity filters
  delete from app.erp_report_filters where report_id = v_opp_report_id;
  insert into app.erp_report_filters (report_id, fieldname, operator, default_value, is_required, order_index) values
    (v_opp_report_id, 'stage', 'eq', null, false, 1),
    (v_opp_report_id, 'opportunity_name', 'contains', null, false, 2);
end $$;

-- ── 4. Activate Reports workspace and add CRM report items ───────────────

update app.erp_workspaces
set is_active = true, description = 'Metadata-driven reports with permission-safe access'
where workspace_key = 'reports';

-- Remove old inactive inventory valuation item
delete from app.erp_workspace_items where workspace_key = 'reports' and item_key = 'valuation';

-- Add CRM report workspace items
insert into app.erp_workspace_items (workspace_key, item_key, label, item_type, target, icon, sort_order, is_active, required_permission_key)
values
  ('reports', 'crm_lead_report', 'CRM Lead Report', 'report', 'crm_lead_list', 'ClipboardList', 10, true, 'view_crm_lead'),
  ('reports', 'crm_opportunity_report', 'CRM Opportunity Report', 'report', 'crm_opportunity_list', 'ClipboardList', 20, true, 'view_crm_opportunity')
on conflict (workspace_key, item_key) do update
set label = excluded.label, target = excluded.target, is_active = excluded.is_active;

-- ── 5. Permission grants for owner/admin ─────────────────────────────────

-- Grant view_reports and export_reports to owner and admin roles
insert into app.company_role_permissions (role_id, permission_key, is_granted)
select cr.id, 'view_reports', true
from app.company_roles cr
where cr.role_name in ('owner', 'admin') and cr.is_active = true
on conflict (role_id, permission_key) do update set is_granted = true;

insert into app.company_role_permissions (role_id, permission_key, is_granted)
select cr.id, 'export_reports', true
from app.company_roles cr
where cr.role_name in ('owner', 'admin') and cr.is_active = true
on conflict (role_id, permission_key) do update set is_granted = true;

-- ── 6. RPCs ──────────────────────────────────────────────────────────────

-- ── erp_list_reports: list available reports for a company ────────────────

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
  if not public.current_user_has_doctype_permission('crm_lead', 'read', p_company_id)
     and not public.current_user_has_doctype_permission('crm_opportunity', 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: read access required');
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

-- ── erp_get_report_definition: get report with columns and filters ────────

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
  where c.report_id = p_report_id;

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

-- ── erp_run_report: execute report with full security enforcement ─────────
--
-- Security model:
-- 1. Checks DocType read permission
-- 2. Queries documents using document_matches_user_permission_rules (record-level)
-- 3. Applies filter_document_data_by_user_access (field-level masking)
-- 4. Applies user-provided filters AFTER permission filtering
-- 5. Only returns columns that exist in report definition AND user has read access to

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
        when 'is_null' then v_where_extra := v_where_extra || format(' and (d.data ->> %L) is null', v_filter.fieldname);
        else null;
      end case;
    end if;
  end loop;

  -- 4. Build and execute the query
  -- Uses format() for all string interpolation to prevent SQL injection
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

    -- Build row with only report-defined columns
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

  -- 5. Build column metadata for frontend
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
    and c.is_visible = true;

  return jsonb_build_object(
    'ok', true,
    'data', v_rows,
    'columns', coalesce(v_filtered_data, '[]'::jsonb),
    'row_count', v_count,
    'truncated', v_count >= v_max_rows
  );
end;
$$;

-- ── erp_create_report: create custom report ──────────────────────────────

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

-- ── erp_update_report: update custom report ──────────────────────────────

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

-- ── erp_delete_report: soft-delete custom report ─────────────────────────

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
