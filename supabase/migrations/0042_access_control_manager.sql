-- Phase 6.0: Access Control Manager foundation.
-- Reuses existing role, role-permission, role-assignment, DocType action, and
-- workspace metadata tables. Adds helper RPCs for a richer company-level access
-- matrix without introducing duplicate permission storage.

create or replace function public.normalize_access_action_key(p_action_key text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(trim(p_action_key), ''))
    when 'read' then 'read'
    when 'view' then 'read'
    when 'create' then 'create'
    when 'insert' then 'create'
    when 'write' then 'create'
    when 'update' then 'update'
    when 'edit' then 'update'
    when 'delete' then 'delete'
    when 'deactivate' then 'delete'
    when 'remove' then 'delete'
    when 'submit' then 'submit'
    when 'cancel' then 'cancel'
    when 'print' then 'print'
    when 'export' then 'export'
    when 'import' then 'import'
    when 'report' then 'report'
    else lower(coalesce(trim(p_action_key), ''))
  end;
$$;

create or replace function public.default_access_permission_key(
  p_target_type text,
  p_target_key text,
  p_right_key text
)
returns text
language plpgsql
immutable
as $$
declare
  v_target_type text := lower(coalesce(trim(p_target_type), ''));
  v_target_key text := lower(coalesce(trim(p_target_key), ''));
  v_right_key text := public.normalize_access_action_key(p_right_key);
begin
  if v_target_key = '' then
    return '';
  end if;

  if v_right_key = 'read' then
    return 'view_' || v_target_key;
  end if;

  if v_target_type = 'doctype' and v_right_key = 'delete' then
    return 'delete_' || v_target_key;
  end if;

  return v_right_key || '_' || v_target_key;
end;
$$;

create or replace function public.get_access_control_targets(p_company_id uuid)
returns table (
  target_type text,
  target_key text,
  label text,
  module_key text,
  module_label text,
  workspace_key text,
  item_key text,
  item_type text,
  required_permission_key text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  with doctype_targets as (
    select
      'doctype'::text as target_type,
      d.doctype_key as target_key,
      d.label,
      d.module_key,
      coalesce(m.label, initcap(replace(d.module_key, '_', ' '))) as module_label,
      null::text as workspace_key,
      d.doctype_key as item_key,
      'doctype'::text as item_type,
      (
        select da.permission_key
        from app.erp_doctype_actions da
        where da.doctype_key = d.doctype_key
          and public.normalize_access_action_key(da.action_key) = 'read'
        order by da.action_key
        limit 1
      ) as required_permission_key,
      coalesce(m.sort_order, 0) as sort_order
    from app.erp_doctypes d
    left join app.erp_modules m on m.module_key = d.module_key
    where d.is_active = true
  ),
  workspace_targets as (
    select
      case
        when wi.item_type = 'page' then 'page'
        when wi.item_type = 'report' then 'report'
        else 'menu'
      end as target_type,
      wi.item_key as target_key,
      wi.label,
      wi.workspace_key as module_key,
      coalesce(ws.label, initcap(replace(wi.workspace_key, '_', ' '))) as module_label,
      wi.workspace_key,
      wi.item_key,
      wi.item_type,
      wi.required_permission_key,
      coalesce(wi.sort_order, 0) as sort_order
    from app.erp_workspace_items wi
    left join app.erp_workspaces ws on ws.workspace_key = wi.workspace_key
    where wi.is_active = true
  )
  select *
  from (
    select * from doctype_targets
    union all
    select * from workspace_targets
  ) targets
  where app.current_user_is_tenant_member(p_company_id)
  order by
    case targets.target_type
      when 'doctype' then 1
      when 'page' then 2
      when 'report' then 3
      else 4
    end,
    targets.module_label,
    targets.sort_order,
    targets.label;
$$;

create or replace function public.get_access_control_matrix(
  p_company_id uuid,
  p_role_id uuid default null,
  p_target_type text default null,
  p_target_key text default null
)
returns table (
  target_type text,
  target_key text,
  label text,
  module_key text,
  module_label text,
  workspace_key text,
  right_key text,
  permission_key text,
  is_granted boolean,
  is_configured boolean,
  source_item_type text,
  required_permission_key text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  with role_scope as (
    select r.id
    from app.company_roles r
    where p_role_id is not null
      and r.id = p_role_id
      and r.tenant_id = p_company_id
  ),
  doctype_rights as (
    select
      'doctype'::text as target_type,
      d.doctype_key as target_key,
      d.label,
      d.module_key,
      coalesce(m.label, initcap(replace(d.module_key, '_', ' '))) as module_label,
      null::text as workspace_key,
      rk.right_key,
      coalesce(da.permission_key, public.default_access_permission_key('doctype', d.doctype_key, rk.right_key)) as permission_key,
      case
        when p_role_id is null then false
        else exists (
          select 1
          from app.company_role_permissions crp
          where crp.role_id = p_role_id
            and crp.permission_key = coalesce(da.permission_key, public.default_access_permission_key('doctype', d.doctype_key, rk.right_key))
            and crp.is_granted = true
        )
      end as is_granted,
      (da.permission_key is not null) as is_configured,
      'doctype'::text as source_item_type,
      (
        select read_da.permission_key
        from app.erp_doctype_actions read_da
        where read_da.doctype_key = d.doctype_key
          and public.normalize_access_action_key(read_da.action_key) = 'read'
        order by read_da.action_key
        limit 1
      ) as required_permission_key,
      coalesce(m.sort_order, 0) as sort_order
    from app.erp_doctypes d
    left join app.erp_modules m on m.module_key = d.module_key
    cross join (
      values ('read'), ('create'), ('update'), ('delete'), ('submit'), ('cancel'), ('print'), ('export'), ('import'), ('report')
    ) as rk(right_key)
    left join lateral (
      select da.permission_key
      from app.erp_doctype_actions da
      where da.doctype_key = d.doctype_key
        and public.normalize_access_action_key(da.action_key) = rk.right_key
      order by
        case da.action_key
          when 'read' then 1
          when 'create' then 1
          when 'update' then 1
          when 'deactivate' then 1
          when 'submit' then 1
          when 'cancel' then 1
          when 'print' then 1
          when 'export' then 1
          when 'import' then 1
          when 'report' then 1
          else 2
        end,
        da.action_key
      limit 1
    ) da on true
    where d.is_active = true
  ),
  workspace_rights as (
    select
      case
        when wi.item_type = 'page' then 'page'
        when wi.item_type = 'report' then 'report'
        else 'menu'
      end as target_type,
      wi.item_key as target_key,
      wi.label,
      wi.workspace_key as module_key,
      coalesce(ws.label, initcap(replace(wi.workspace_key, '_', ' '))) as module_label,
      wi.workspace_key,
      'read'::text as right_key,
      coalesce(wi.required_permission_key, public.default_access_permission_key(
        case
          when wi.item_type = 'page' then 'page'
          when wi.item_type = 'report' then 'report'
          else 'menu'
        end,
        wi.item_key,
        'read'
      )) as permission_key,
      case
        when p_role_id is null then false
        else exists (
          select 1
          from app.company_role_permissions crp
          where crp.role_id = p_role_id
            and crp.permission_key = coalesce(wi.required_permission_key, public.default_access_permission_key(
              case
                when wi.item_type = 'page' then 'page'
                when wi.item_type = 'report' then 'report'
                else 'menu'
              end,
              wi.item_key,
              'read'
            ))
            and crp.is_granted = true
        )
      end as is_granted,
      (wi.required_permission_key is not null and trim(wi.required_permission_key) <> '') as is_configured,
      wi.item_type as source_item_type,
      wi.required_permission_key,
      coalesce(wi.sort_order, 0) as sort_order
    from app.erp_workspace_items wi
    left join app.erp_workspaces ws on ws.workspace_key = wi.workspace_key
    where wi.is_active = true
  )
  select *
  from (
    select * from doctype_rights
    union all
    select * from workspace_rights
  ) matrix
  where app.current_user_is_tenant_member(p_company_id)
    and (p_role_id is null or exists (select 1 from role_scope))
    and (p_target_type is null or matrix.target_type = lower(p_target_type))
    and (p_target_key is null or matrix.target_key = p_target_key)
  order by
    case matrix.target_type
      when 'doctype' then 1
      when 'page' then 2
      when 'report' then 3
      else 4
    end,
    matrix.module_label,
    matrix.sort_order,
    matrix.label,
    case matrix.right_key
      when 'read' then 1
      when 'create' then 2
      when 'update' then 3
      when 'delete' then 4
      when 'submit' then 5
      when 'cancel' then 6
      when 'print' then 7
      when 'export' then 8
      when 'import' then 9
      when 'report' then 10
      else 99
    end;
$$;

create or replace function public.get_company_user_role_assignments(
  p_company_id uuid,
  p_user_id uuid
)
returns table (
  role_id uuid,
  role_key text,
  role_name text,
  description text,
  is_system boolean,
  is_active boolean,
  sort_order integer
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select
    r.id as role_id,
    r.role_key,
    r.role_name,
    r.description,
    r.is_system,
    ra.is_active,
    r.sort_order
  from app.company_role_assignments ra
  join app.company_roles r on r.id = ra.role_id
  where r.tenant_id = p_company_id
    and ra.user_id = p_user_id
  order by ra.is_active desc, r.sort_order, r.role_name;
$$;

drop function if exists public.get_company_users(uuid);

create or replace function public.get_company_users(p_company_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  membership_role text,
  is_active boolean,
  assigned_role_id uuid,
  assigned_role_key text,
  assigned_role_name text,
  assigned_role_is_system boolean,
  effective_permission_keys text[],
  effective_permission_count bigint,
  active_assignment_count bigint
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select
    tm.user_id,
    coalesce(p.full_name, '') as full_name,
    coalesce(p.email, '') as email,
    tm.role::text as membership_role,
    tm.is_active,
    ar.role_id as assigned_role_id,
    ar.role_key as assigned_role_key,
    ar.role_name as assigned_role_name,
    ar.is_system as assigned_role_is_system,
    coalesce(ap.permission_keys, '{}'::text[]) as effective_permission_keys,
    coalesce(ap.permission_count, 0) as effective_permission_count,
    coalesce(ac.active_assignment_count, 0) as active_assignment_count
  from app.tenant_members tm
  join app.profiles p on p.id = tm.user_id
  left join lateral (
    select
      r.id as role_id,
      r.role_key,
      r.role_name,
      r.is_system
    from app.company_role_assignments ra
    join app.company_roles r on r.id = ra.role_id
    where ra.user_id = tm.user_id
      and ra.is_active = true
      and r.tenant_id = p_company_id
      and r.is_active = true
    order by r.sort_order, r.role_name, ra.updated_at desc, ra.created_at desc
    limit 1
  ) ar on true
  left join lateral (
    select
      coalesce(array_agg(perms.permission_key order by perms.permission_key), '{}'::text[]) as permission_keys,
      count(*)::bigint as permission_count
    from (
      select distinct rp.permission_key
      from app.company_role_assignments ra
      join app.company_roles r on r.id = ra.role_id
      join app.company_role_permissions rp on rp.role_id = r.id and rp.is_granted = true
      where ra.user_id = tm.user_id
        and ra.is_active = true
        and r.tenant_id = p_company_id
        and r.is_active = true
    ) perms
  ) ap on true
  left join lateral (
    select count(*)::bigint as active_assignment_count
    from app.company_role_assignments ra
    join app.company_roles r on r.id = ra.role_id
    where ra.user_id = tm.user_id
      and ra.is_active = true
      and r.tenant_id = p_company_id
      and r.is_active = true
  ) ac on true
  where tm.tenant_id = p_company_id
  order by tm.is_active desc, p.full_name nulls last, p.email nulls last;
$$;

create or replace function public.set_company_user_roles(
  p_company_id uuid,
  p_user_id uuid,
  p_role_ids uuid[] default '{}'::uuid[]
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  membership_role text,
  is_active boolean,
  assigned_role_id uuid,
  assigned_role_key text,
  assigned_role_name text,
  assigned_role_is_system boolean,
  effective_permission_keys text[],
  effective_permission_count bigint,
  active_assignment_count bigint
)
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_role_id uuid;
  v_role_count integer := 0;
  v_distinct_role_ids uuid[] := coalesce(
    array(
      select distinct role_id
      from unnest(coalesce(p_role_ids, '{}'::uuid[])) as role_id
      where role_id is not null
    ),
    '{}'::uuid[]
  );
begin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    raise exception 'Not authorized to manage user roles';
  end if;

  if not exists (
    select 1
    from app.tenant_members tm
    where tm.tenant_id = p_company_id
      and tm.user_id = p_user_id
  ) then
    raise exception 'User is not a member of this company';
  end if;

  if cardinality(v_distinct_role_ids) > 0 then
    select count(*)
    into v_role_count
    from app.company_roles r
    where r.tenant_id = p_company_id
      and r.is_active = true
      and r.id = any(v_distinct_role_ids);

    if v_role_count <> cardinality(v_distinct_role_ids) then
      raise exception 'One or more roles are invalid for this company';
    end if;
  end if;

  update app.company_role_assignments ra
  set is_active = false,
      updated_at = now()
  where ra.user_id = p_user_id
    and exists (
      select 1
      from app.company_roles r
      where r.id = ra.role_id
        and r.tenant_id = p_company_id
    );

  foreach v_role_id in array v_distinct_role_ids
  loop
    insert into app.company_role_assignments (role_id, user_id, is_active)
    values (v_role_id, p_user_id, true)
    on conflict (role_id, user_id) do update
    set is_active = true,
        updated_at = now();
  end loop;

  return query
  select *
  from public.get_company_users(p_company_id)
  where get_company_users.user_id = p_user_id;
end;
$$;

create or replace function public.set_company_user_role(
  p_company_id uuid,
  p_user_id uuid,
  p_role_id uuid default null
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  membership_role text,
  is_active boolean,
  assigned_role_id uuid,
  assigned_role_key text,
  assigned_role_name text,
  assigned_role_is_system boolean,
  effective_permission_keys text[],
  effective_permission_count bigint,
  active_assignment_count bigint
)
language plpgsql
security definer
set search_path = public, app, auth
as $$
begin
  if p_role_id is null then
    return query
    select *
    from public.set_company_user_roles(p_company_id, p_user_id, '{}'::uuid[]);
  end if;

  return query
  select *
  from public.set_company_user_roles(p_company_id, p_user_id, array[p_role_id]::uuid[]);
end;
$$;

create or replace function public.current_user_has_doctype_permission(
  p_doctype_key text,
  p_action_key text,
  p_company_id uuid
)
returns boolean
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
      and public.normalize_access_action_key(da.action_key) = public.normalize_access_action_key(p_action_key)
      and cra.user_id = auth.uid()
      and cra.is_active = true
  );
$$;

create or replace function public.save_access_control_matrix(
  p_company_id uuid,
  p_role_id uuid,
  p_entries jsonb
)
returns table (
  permission_key text,
  target_type text,
  target_key text,
  right_key text,
  is_granted boolean
)
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_role app.company_roles%rowtype;
  v_entry jsonb;
  v_target_type text;
  v_target_key text;
  v_right_key text;
  v_permission_key text;
  v_workspace_key text;
  v_workspace_item app.erp_workspace_items%rowtype;
  v_doctype app.erp_doctypes%rowtype;
  v_module_label text;
  v_permission_label text;
  v_description text;
  v_sort_order integer;
  v_action_key text;
  v_is_granted boolean;
  v_owner_admin_role_id uuid;
begin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    raise exception 'Not authorized to manage access control';
  end if;

  select *
  into v_role
  from app.company_roles r
  where r.id = p_role_id
    and r.tenant_id = p_company_id;

  if not found then
    raise exception 'Role not found';
  end if;

  if jsonb_typeof(coalesce(p_entries, '[]'::jsonb)) <> 'array' then
    raise exception 'Entries payload must be a JSON array';
  end if;

  for v_entry in
    select value
    from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb))
  loop
    v_target_type := lower(coalesce(trim(v_entry->>'target_type'), ''));
    v_target_key := coalesce(trim(v_entry->>'target_key'), '');
    v_right_key := public.normalize_access_action_key(v_entry->>'right_key');
    v_permission_key := coalesce(nullif(trim(v_entry->>'permission_key'), ''), public.default_access_permission_key(v_target_type, v_target_key, v_right_key));
    v_workspace_key := nullif(trim(v_entry->>'workspace_key'), '');
    v_is_granted := coalesce((v_entry->>'is_granted')::boolean, false);

    if v_target_type not in ('doctype', 'page', 'report', 'menu') then
      raise exception 'Unsupported target type: %', v_target_type;
    end if;

    if v_target_key = '' then
      raise exception 'Target key is required';
    end if;

    if v_permission_key = '' then
      raise exception 'Permission key is required';
    end if;

    if v_target_type = 'doctype' then
      select *
      into v_doctype
      from app.erp_doctypes d
      where d.doctype_key = v_target_key;

      if not found then
        raise exception 'DocType not found: %', v_target_key;
      end if;

      select coalesce(m.label, initcap(replace(v_doctype.module_key, '_', ' ')))
      into v_module_label
      from app.erp_modules m
      where m.module_key = v_doctype.module_key;

      v_action_key := case v_right_key
        when 'delete' then 'deactivate'
        else v_right_key
      end;
      v_permission_label := initcap(replace(v_permission_key, '_', ' '));
      v_description := format('Access control permission for %s (%s).', v_doctype.label, v_right_key);
      v_sort_order := 700;

      insert into app.permissions (
        permission_key,
        module_key,
        module_label,
        permission_label,
        description,
        sort_order,
        is_active
      )
      values (
        v_permission_key,
        v_doctype.module_key,
        coalesce(v_module_label, initcap(replace(v_doctype.module_key, '_', ' '))),
        v_permission_label,
        v_description,
        v_sort_order,
        true
      )
      on conflict (permission_key) do update
      set
        module_key = excluded.module_key,
        module_label = excluded.module_label,
        permission_label = excluded.permission_label,
        description = excluded.description,
        is_active = true,
        updated_at = now();

      insert into app.erp_doctype_actions (
        doctype_key,
        action_key,
        permission_key
      )
      values (
        v_doctype.doctype_key,
        v_action_key,
        v_permission_key
      )
      on conflict (doctype_key, action_key) do update
      set permission_key = excluded.permission_key;
    else
      select wi.*
      into v_workspace_item
      from app.erp_workspace_items wi
      where wi.item_key = v_target_key
        and (v_workspace_key is null or wi.workspace_key = v_workspace_key)
        and (
          (v_target_type = 'page' and wi.item_type = 'page')
          or (v_target_type = 'report' and wi.item_type = 'report')
          or (v_target_type = 'menu' and wi.item_type not in ('page', 'report'))
        )
      order by wi.workspace_key, wi.sort_order
      limit 1;

      if not found then
        raise exception 'Workspace target not found: %', v_target_key;
      end if;

      select coalesce(ws.label, initcap(replace(v_workspace_item.workspace_key, '_', ' ')))
      into v_module_label
      from app.erp_workspaces ws
      where ws.workspace_key = v_workspace_item.workspace_key;

      v_permission_label := initcap(replace(v_permission_key, '_', ' '));
      v_description := format('Access control permission for %s (%s).', v_workspace_item.label, v_target_type);
      v_sort_order := 720;

      insert into app.permissions (
        permission_key,
        module_key,
        module_label,
        permission_label,
        description,
        sort_order,
        is_active
      )
      values (
        v_permission_key,
        v_workspace_item.workspace_key,
        coalesce(v_module_label, initcap(replace(v_workspace_item.workspace_key, '_', ' '))),
        v_permission_label,
        v_description,
        v_sort_order,
        true
      )
      on conflict (permission_key) do update
      set
        module_key = excluded.module_key,
        module_label = excluded.module_label,
        permission_label = excluded.permission_label,
        description = excluded.description,
        is_active = true,
        updated_at = now();

      if coalesce(trim(v_workspace_item.required_permission_key), '') = '' then
        update app.erp_workspace_items
        set required_permission_key = v_permission_key
        where workspace_key = v_workspace_item.workspace_key
          and item_key = v_workspace_item.item_key;
      end if;
    end if;

    for v_owner_admin_role_id in
      select r.id
      from app.company_roles r
      where r.tenant_id = p_company_id
        and r.is_active = true
        and r.role_key in ('owner', 'admin')
    loop
      insert into app.company_role_permissions (role_id, permission_key, is_granted)
      values (v_owner_admin_role_id, v_permission_key, true)
      on conflict (role_id, permission_key) do update
      set is_granted = true,
          updated_at = now();
    end loop;

    if v_is_granted then
      insert into app.company_role_permissions (role_id, permission_key, is_granted)
      values (p_role_id, v_permission_key, true)
      on conflict (role_id, permission_key) do update
      set is_granted = true,
          updated_at = now();
    else
      delete from app.company_role_permissions crp
      where crp.role_id = p_role_id
        and crp.permission_key = v_permission_key;
    end if;

    permission_key := v_permission_key;
    target_type := v_target_type;
    target_key := v_target_key;
    right_key := v_right_key;
    is_granted := v_is_granted;
    return next;
  end loop;

  return;
end;
$$;

grant execute on function public.normalize_access_action_key(text) to authenticated;
grant execute on function public.default_access_permission_key(text, text, text) to authenticated;
grant execute on function public.get_access_control_targets(uuid) to authenticated;
grant execute on function public.get_access_control_matrix(uuid, uuid, text, text) to authenticated;
grant execute on function public.get_company_user_role_assignments(uuid, uuid) to authenticated;
grant execute on function public.get_company_users(uuid) to authenticated;
grant execute on function public.set_company_user_roles(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.set_company_user_role(uuid, uuid, uuid) to authenticated;
grant execute on function public.current_user_has_doctype_permission(text, text, uuid) to authenticated;
grant execute on function public.save_access_control_matrix(uuid, uuid, jsonb) to authenticated;
