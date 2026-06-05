-- Phase 6.5: Permission Levels and User Permissions Foundation
--
-- Adds:
-- - permlevel support on metadata fields
-- - role-based DocType permlevel grants
-- - record-level user permission rules
-- - generic_json enforcement for field-level read/write and record filtering

alter table app.erp_docfields
  add column if not exists permlevel integer not null default 0;

alter table app.erp_docfields
  drop constraint if exists erp_docfields_permlevel_check,
  add constraint erp_docfields_permlevel_check check (permlevel between 0 and 9);

create table if not exists app.company_doctype_permlevels (
  role_id uuid not null references app.company_roles(id) on delete cascade,
  doctype_key text not null references app.erp_doctypes(doctype_key) on delete cascade,
  permlevel integer not null,
  can_read boolean not null default false,
  can_write boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_id, doctype_key, permlevel),
  constraint company_doctype_permlevels_permlevel_check check (permlevel between 0 and 9)
);

create table if not exists app.company_user_permissions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references app.tenants(id) on delete cascade,
  user_id uuid not null references app.profiles(id) on delete cascade,
  doctype_key text not null references app.erp_doctypes(doctype_key) on delete cascade,
  fieldname text not null,
  allowed_value text not null,
  apply_read boolean not null default true,
  apply_write boolean not null default false,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_user_permissions_allowed_value_check check (length(trim(allowed_value)) > 0)
);

create unique index if not exists company_user_permissions_unique_rule
  on app.company_user_permissions (company_id, user_id, doctype_key, fieldname, allowed_value);

create index if not exists idx_company_user_permissions_lookup
  on app.company_user_permissions (company_id, user_id, doctype_key, is_active);

alter table app.company_doctype_permlevels enable row level security;
alter table app.company_user_permissions enable row level security;

drop policy if exists company_doctype_permlevels_read on app.company_doctype_permlevels;
create policy company_doctype_permlevels_read on app.company_doctype_permlevels
for select to authenticated using (false);

drop policy if exists company_doctype_permlevels_write on app.company_doctype_permlevels;
create policy company_doctype_permlevels_write on app.company_doctype_permlevels
for all to authenticated using (false) with check (false);

drop policy if exists company_user_permissions_read on app.company_user_permissions;
create policy company_user_permissions_read on app.company_user_permissions
for select to authenticated using (false);

drop policy if exists company_user_permissions_write on app.company_user_permissions;
create policy company_user_permissions_write on app.company_user_permissions
for all to authenticated using (false) with check (false);

update app.erp_docfields
set permlevel = case
  when fieldname in ('email', 'phone', 'notes') then 1
  else 0
end
where doctype_key = 'crm_lead';

create or replace function public.current_user_is_company_owner_or_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select app.current_user_has_tenant_role(p_company_id, array['owner','admin']);
$$;

create or replace function public.user_is_company_owner_or_admin(
  p_company_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select exists (
    select 1
    from app.tenant_members tm
    where tm.tenant_id = p_company_id
      and tm.user_id = p_user_id
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  );
$$;

create or replace function public.role_has_doctype_base_permission(
  p_role_id uuid,
  p_doctype_key text,
  p_access text
)
returns boolean
language sql
stable
security definer
set search_path = public, app, auth
as $$
  with normalized as (
    select lower(coalesce(trim(p_access), '')) as access_key
  )
  select case
    when normalized.access_key = 'read' then exists (
      select 1
      from app.erp_doctype_actions da
      join app.company_role_permissions crp
        on crp.permission_key = da.permission_key
       and crp.role_id = p_role_id
       and crp.is_granted = true
      where da.doctype_key = p_doctype_key
        and public.normalize_access_action_key(da.action_key) = 'read'
    )
    when normalized.access_key = 'write' then exists (
      select 1
      from app.erp_doctype_actions da
      join app.company_role_permissions crp
        on crp.permission_key = da.permission_key
       and crp.role_id = p_role_id
       and crp.is_granted = true
      where da.doctype_key = p_doctype_key
        and public.normalize_access_action_key(da.action_key) in ('create', 'update')
    )
    else false
  end
  from normalized;
$$;

create or replace function public.get_user_doctype_max_permlevel(
  p_user_id uuid,
  p_company_id uuid,
  p_doctype_key text,
  p_access text
)
returns integer
language plpgsql
stable
security definer
set search_path = public, app, auth
as $$
declare
  v_access text := lower(coalesce(trim(p_access), ''));
  v_base integer := -1;
  v_explicit integer := -1;
  v_max_defined integer := 0;
begin
  select coalesce(max(df.permlevel), 0)
  into v_max_defined
  from app.erp_docfields df
  where df.doctype_key = p_doctype_key;

  if public.user_is_company_owner_or_admin(p_company_id, p_user_id) then
    return v_max_defined;
  end if;

  if v_access = 'read' then
    if exists (
      select 1
      from app.erp_doctype_actions da
      join app.company_role_assignments cra
        on cra.user_id = p_user_id
       and cra.is_active = true
      join app.company_roles cr
        on cr.id = cra.role_id
       and cr.tenant_id = p_company_id
       and cr.is_active = true
      join app.company_role_permissions crp
        on crp.role_id = cr.id
       and crp.permission_key = da.permission_key
       and crp.is_granted = true
      where da.doctype_key = p_doctype_key
        and public.normalize_access_action_key(da.action_key) = 'read'
    ) then
      v_base := 0;
    end if;

    select coalesce(max(cdp.permlevel), -1)
    into v_explicit
    from app.company_doctype_permlevels cdp
    join app.company_role_assignments cra
      on cra.role_id = cdp.role_id
     and cra.user_id = p_user_id
     and cra.is_active = true
    join app.company_roles cr
      on cr.id = cdp.role_id
     and cr.tenant_id = p_company_id
     and cr.is_active = true
    where cdp.doctype_key = p_doctype_key
      and cdp.is_active = true
      and cdp.can_read = true;
  elsif v_access = 'write' then
    if exists (
      select 1
      from app.erp_doctype_actions da
      join app.company_role_assignments cra
        on cra.user_id = p_user_id
       and cra.is_active = true
      join app.company_roles cr
        on cr.id = cra.role_id
       and cr.tenant_id = p_company_id
       and cr.is_active = true
      join app.company_role_permissions crp
        on crp.role_id = cr.id
       and crp.permission_key = da.permission_key
       and crp.is_granted = true
      where da.doctype_key = p_doctype_key
        and public.normalize_access_action_key(da.action_key) in ('create', 'update')
    ) then
      v_base := 0;
    end if;

    select coalesce(max(cdp.permlevel), -1)
    into v_explicit
    from app.company_doctype_permlevels cdp
    join app.company_role_assignments cra
      on cra.role_id = cdp.role_id
     and cra.user_id = p_user_id
     and cra.is_active = true
    join app.company_roles cr
      on cr.id = cdp.role_id
     and cr.tenant_id = p_company_id
     and cr.is_active = true
    where cdp.doctype_key = p_doctype_key
      and cdp.is_active = true
      and cdp.can_write = true;
  else
    raise exception 'Unsupported permlevel access mode: %', p_access;
  end if;

  return greatest(v_base, v_explicit);
end;
$$;

create or replace function public.filter_document_data_by_user_access(
  p_user_id uuid,
  p_company_id uuid,
  p_doctype_key text,
  p_data jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, app, auth
as $$
declare
  v_max_read integer;
  v_result jsonb;
begin
  v_max_read := public.get_user_doctype_max_permlevel(p_user_id, p_company_id, p_doctype_key, 'read');
  if v_max_read < 0 then
    return '{}'::jsonb;
  end if;

  select coalesce(
    jsonb_object_agg(df.fieldname, p_data -> df.fieldname)
      filter (where p_data ? df.fieldname),
    '{}'::jsonb
  )
  into v_result
  from app.erp_docfields df
  where df.doctype_key = p_doctype_key
    and df.permlevel <= v_max_read;

  return coalesce(v_result, '{}'::jsonb);
end;
$$;

create or replace function public.document_matches_user_permission_rules(
  p_user_id uuid,
  p_company_id uuid,
  p_doctype_key text,
  p_document_data jsonb,
  p_mode text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, app, auth
as $$
declare
  v_mode text := lower(coalesce(trim(p_mode), 'read'));
  v_has_rules boolean := false;
begin
  if public.user_is_company_owner_or_admin(p_company_id, p_user_id) then
    return true;
  end if;

  select exists (
    select 1
    from app.company_user_permissions cup
    where cup.company_id = p_company_id
      and cup.user_id = p_user_id
      and cup.doctype_key = p_doctype_key
      and cup.is_active = true
      and (
        (v_mode = 'read' and cup.apply_read = true)
        or (v_mode = 'write' and cup.apply_write = true)
      )
  )
  into v_has_rules;

  if not v_has_rules then
    return true;
  end if;

  return not exists (
    with grouped_rules as (
      select
        cup.fieldname,
        array_agg(cup.allowed_value order by cup.allowed_value) as allowed_values
      from app.company_user_permissions cup
      where cup.company_id = p_company_id
        and cup.user_id = p_user_id
        and cup.doctype_key = p_doctype_key
        and cup.is_active = true
        and (
          (v_mode = 'read' and cup.apply_read = true)
          or (v_mode = 'write' and cup.apply_write = true)
        )
      group by cup.fieldname
    )
    select 1
    from grouped_rules gr
    where coalesce(p_document_data ->> gr.fieldname, '') <> all(gr.allowed_values)
  );
end;
$$;

create or replace function public.get_current_user_doctype_field_access(
  p_doctype_key text,
  p_company_id uuid
)
returns table (
  fieldname text,
  label text,
  permlevel integer,
  can_read boolean,
  can_write boolean
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  with access_levels as (
    select
      public.get_user_doctype_max_permlevel(auth.uid(), p_company_id, p_doctype_key, 'read') as max_read,
      public.get_user_doctype_max_permlevel(auth.uid(), p_company_id, p_doctype_key, 'write') as max_write
  )
  select
    df.fieldname,
    df.label,
    df.permlevel,
    df.permlevel <= access_levels.max_read as can_read,
    df.permlevel <= access_levels.max_write as can_write
  from app.erp_docfields df
  cross join access_levels
  where df.doctype_key = p_doctype_key
  order by df.sort_order, df.fieldname;
$$;

create or replace function public.get_role_doctype_permlevel_matrix(
  p_company_id uuid,
  p_role_id uuid,
  p_doctype_key text,
  p_user_id uuid default null
)
returns table (
  permlevel integer,
  field_count integer,
  field_labels text[],
  role_can_read boolean,
  role_can_write boolean,
  effective_user_can_read boolean,
  effective_user_can_write boolean
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  with levels as (
    select
      df.permlevel,
      count(*)::integer as field_count,
      array_agg(df.label order by df.sort_order, df.label) as field_labels
    from app.erp_docfields df
    where df.doctype_key = p_doctype_key
    group by df.permlevel
  )
  select
    levels.permlevel,
    levels.field_count,
    levels.field_labels,
    case
      when levels.permlevel = 0 then public.role_has_doctype_base_permission(p_role_id, p_doctype_key, 'read')
      else exists (
        select 1
        from app.company_doctype_permlevels cdp
        where cdp.role_id = p_role_id
          and cdp.doctype_key = p_doctype_key
          and cdp.permlevel = levels.permlevel
          and cdp.is_active = true
          and cdp.can_read = true
      )
    end as role_can_read,
    case
      when levels.permlevel = 0 then public.role_has_doctype_base_permission(p_role_id, p_doctype_key, 'write')
      else exists (
        select 1
        from app.company_doctype_permlevels cdp
        where cdp.role_id = p_role_id
          and cdp.doctype_key = p_doctype_key
          and cdp.permlevel = levels.permlevel
          and cdp.is_active = true
          and cdp.can_write = true
      )
    end as role_can_write,
    case
      when p_user_id is null then false
      else public.get_user_doctype_max_permlevel(p_user_id, p_company_id, p_doctype_key, 'read') >= levels.permlevel
    end as effective_user_can_read,
    case
      when p_user_id is null then false
      else public.get_user_doctype_max_permlevel(p_user_id, p_company_id, p_doctype_key, 'write') >= levels.permlevel
    end as effective_user_can_write
  from levels
  order by levels.permlevel;
$$;

create or replace function public.save_role_doctype_permlevels(
  p_company_id uuid,
  p_role_id uuid,
  p_doctype_key text,
  p_rows jsonb
)
returns table (
  permlevel integer,
  can_read boolean,
  can_write boolean
)
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_row jsonb;
  v_permlevel integer;
  v_can_read boolean;
  v_can_write boolean;
begin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    raise exception 'Not authorized to manage DocType permlevels';
  end if;

  if not exists (
    select 1
    from app.company_roles cr
    where cr.id = p_role_id
      and cr.tenant_id = p_company_id
  ) then
    raise exception 'Role not found for this company';
  end if;

  if not exists (
    select 1
    from app.erp_doctypes d
    where d.doctype_key = p_doctype_key
      and d.is_active = true
  ) then
    raise exception 'DocType not found';
  end if;

  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array' then
    raise exception 'Rows payload must be a JSON array';
  end if;

  for v_row in
    select value
    from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    v_permlevel := coalesce((v_row->>'permlevel')::integer, 0);
    v_can_read := coalesce((v_row->>'can_read')::boolean, false);
    v_can_write := coalesce((v_row->>'can_write')::boolean, false);

    if v_permlevel < 0 or v_permlevel > 9 then
      raise exception 'Invalid permlevel: %', v_permlevel;
    end if;

    if v_permlevel = 0 then
      permlevel := v_permlevel;
      can_read := public.role_has_doctype_base_permission(p_role_id, p_doctype_key, 'read');
      can_write := public.role_has_doctype_base_permission(p_role_id, p_doctype_key, 'write');
      return next;
      continue;
    end if;

    if not v_can_read and not v_can_write then
      delete from app.company_doctype_permlevels cdp
      where cdp.role_id = p_role_id
        and cdp.doctype_key = p_doctype_key
        and cdp.permlevel = v_permlevel;
    else
      insert into app.company_doctype_permlevels (
        role_id,
        doctype_key,
        permlevel,
        can_read,
        can_write,
        is_active
      )
      values (
        p_role_id,
        p_doctype_key,
        v_permlevel,
        v_can_read,
        v_can_write,
        true
      )
      on conflict (role_id, doctype_key, permlevel) do update
      set
        can_read = excluded.can_read,
        can_write = excluded.can_write,
        is_active = true,
        updated_at = now();
    end if;

    permlevel := v_permlevel;
    can_read := v_can_read;
    can_write := v_can_write;
    return next;
  end loop;

  return;
end;
$$;

create or replace function public.get_company_user_permissions(
  p_company_id uuid,
  p_user_id uuid
)
returns table (
  id uuid,
  doctype_key text,
  doctype_label text,
  fieldname text,
  field_label text,
  permlevel integer,
  allowed_value text,
  apply_read boolean,
  apply_write boolean,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select
    cup.id,
    cup.doctype_key,
    d.label as doctype_label,
    cup.fieldname,
    coalesce(df.label, cup.fieldname) as field_label,
    coalesce(df.permlevel, 0) as permlevel,
    cup.allowed_value,
    cup.apply_read,
    cup.apply_write,
    cup.is_active,
    cup.created_at,
    cup.updated_at
  from app.company_user_permissions cup
  join app.erp_doctypes d on d.doctype_key = cup.doctype_key
  left join app.erp_docfields df
    on df.doctype_key = cup.doctype_key
   and df.fieldname = cup.fieldname
  where cup.company_id = p_company_id
    and cup.user_id = p_user_id
  order by cup.is_active desc, d.label, df.sort_order nulls last, cup.allowed_value;
$$;

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
    insert into app.company_user_permissions (
      company_id,
      user_id,
      doctype_key,
      fieldname,
      allowed_value,
      apply_read,
      apply_write,
      is_active,
      created_by,
      updated_by
    )
    values (
      p_company_id,
      v_user_id,
      v_doctype_key,
      v_fieldname,
      v_allowed_value,
      v_apply_read,
      v_apply_write,
      v_is_active,
      auth.uid(),
      auth.uid()
    )
    on conflict (company_user_permissions.company_id, company_user_permissions.user_id, company_user_permissions.doctype_key, company_user_permissions.fieldname, company_user_permissions.allowed_value) do update
    set
      apply_read = excluded.apply_read,
      apply_write = excluded.apply_write,
      is_active = excluded.is_active,
      updated_by = auth.uid(),
      updated_at = now()
    returning * into v_saved;
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
    returning * into v_saved;

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

create or replace function public.erp_list_documents(
  p_doctype_key text,
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
      'created_by', d.created_by,
      'updated_by', d.updated_by,
      'created_at', d.created_at,
      'updated_at', d.updated_at
    ) order by d.created_at desc
  )
  into v_result
  from app.erp_documents d
  where d.doctype_key = p_doctype_key
    and (not v_doctype.is_company_scoped or d.company_id = p_company_id)
    and d.is_active = true
    and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, d.data, 'read');

  return jsonb_build_object('ok', true, 'data', coalesce(v_result, '[]'::jsonb));
end;
$$;

create or replace function public.erp_get_document(
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

  if not public.current_user_has_doctype_permission(p_doctype_key, 'read', p_company_id) then
    return jsonb_build_object('ok', false, 'error', 'Permission denied');
  end if;

  select
    d.id,
    d.doctype_key,
    d.company_id,
    d.document_number,
    d.title,
    d.data,
    d.is_active,
    d.created_by,
    d.updated_by,
    d.created_at,
    d.updated_at
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
      'created_by', v_doc.created_by,
      'updated_by', v_doc.updated_by,
      'created_at', v_doc.created_at,
      'updated_at', v_doc.updated_at
    )
  );
end;
$$;

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

  return jsonb_build_object('ok', true, 'document_id', v_doc_id);
end;
$$;

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

  return jsonb_build_object('ok', true, 'document_id', p_document_id);
end;
$$;

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
    and (not v_doctype.is_company_scoped or company_id = p_company_id)
    and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, data, 'write');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  return jsonb_build_object('ok', true, 'document_id', p_document_id);
end;
$$;

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
    and (not v_doctype.is_company_scoped or company_id = p_company_id)
    and public.document_matches_user_permission_rules(auth.uid(), p_company_id, p_doctype_key, data, 'write');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Document not found');
  end if;

  return jsonb_build_object('ok', true, 'document_id', p_document_id);
end;
$$;

grant execute on function public.current_user_is_company_owner_or_admin(uuid) to authenticated;
grant execute on function public.user_is_company_owner_or_admin(uuid, uuid) to authenticated;
grant execute on function public.role_has_doctype_base_permission(uuid, text, text) to authenticated;
grant execute on function public.get_user_doctype_max_permlevel(uuid, uuid, text, text) to authenticated;
grant execute on function public.filter_document_data_by_user_access(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.document_matches_user_permission_rules(uuid, uuid, text, jsonb, text) to authenticated;
grant execute on function public.get_current_user_doctype_field_access(text, uuid) to authenticated;
grant execute on function public.get_role_doctype_permlevel_matrix(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.save_role_doctype_permlevels(uuid, uuid, text, jsonb) to authenticated;
grant execute on function public.get_company_user_permissions(uuid, uuid) to authenticated;
grant execute on function public.save_company_user_permission(uuid, jsonb) to authenticated;
