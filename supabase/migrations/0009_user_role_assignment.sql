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
    order by ra.updated_at desc, ra.created_at desc
    limit 1
  ) ar on true
  left join lateral (
    select
      coalesce(array_agg(rp.permission_key order by rp.permission_key), '{}'::text[]) as permission_keys,
      count(*)::bigint as permission_count
    from app.company_role_permissions rp
    where rp.role_id = ar.role_id
      and rp.is_granted = true
  ) ap on true
  left join lateral (
    select count(*)::bigint as active_assignment_count
    from app.company_role_assignments ra
    join app.company_roles r on r.id = ra.role_id
    where ra.user_id = tm.user_id
      and ra.is_active = true
      and r.tenant_id = p_company_id
  ) ac on true
  where tm.tenant_id = p_company_id
  order by tm.is_active desc, p.full_name nulls last, p.email nulls last;
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
#variable_conflict use_column
declare
  v_role app.company_roles%rowtype;
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

  if p_role_id is not null then
    select * into v_role
    from app.company_roles
    where id = p_role_id
      and tenant_id = p_company_id
      and is_active = true;

    if not found then
      raise exception 'Role not found';
    end if;

    insert into app.company_role_assignments (role_id, user_id, is_active)
    values (v_role.id, p_user_id, true)
    on conflict (role_id, user_id) do update
    set is_active = true,
        updated_at = now();
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
        and ra.is_active = true
        and (p_role_id is null or r.id <> p_role_id)
    );

  return query
  select *
  from public.get_company_users(p_company_id)
  where user_id = p_user_id;
end;
$$;

grant execute on function public.get_company_users(uuid) to authenticated;
grant execute on function public.set_company_user_role(uuid, uuid, uuid) to authenticated;
