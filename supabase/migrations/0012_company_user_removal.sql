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
  effective_permission_count integer,
  active_assignment_count integer
)
language sql
stable
security definer
set search_path = app, public, auth
as $$
  with active_members as (
    select tm.user_id, tm.role::text as membership_role, tm.is_active
    from app.tenant_members tm
    where tm.tenant_id = p_company_id
      and tm.is_active = true
  )
  select
    p.id as user_id,
    coalesce(p.full_name, p.email, '') as full_name,
    p.email,
    active_members.membership_role,
    active_members.is_active,
    r.id as assigned_role_id,
    r.role_key as assigned_role_key,
    r.role_name as assigned_role_name,
    r.is_system as assigned_role_is_system,
    coalesce(array_agg(distinct rp.permission_key) filter (where rp.is_granted = true), array[]::text[]) as effective_permission_keys,
    count(distinct rp.permission_key) filter (where rp.is_granted = true)::integer as effective_permission_count,
    count(distinct ra.role_id)::integer as active_assignment_count
  from active_members
  join app.profiles p on p.id = active_members.user_id
  left join app.company_role_assignments ra
    on ra.user_id = p.id
   and ra.is_active = true
  left join app.company_roles r
    on r.id = ra.role_id
   and r.tenant_id = p_company_id
  left join app.company_role_permissions rp
    on rp.role_id = r.id
  group by p.id, p.full_name, p.email, active_members.membership_role, active_members.is_active, r.id, r.role_key, r.role_name, r.is_system
  order by coalesce(p.full_name, p.email, '');
$$;

create or replace function public.remove_company_user(
  p_company_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = app, public, auth
as $$
declare
  v_deleted_members integer := 0;
  v_deleted_assignments integer := 0;
begin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    raise exception 'Only company owner/admin can manage users.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot remove your own company membership.';
  end if;

  delete from app.company_role_assignments ra
  using app.company_roles r
  where ra.role_id = r.id
    and r.tenant_id = p_company_id
    and ra.user_id = p_user_id;

  get diagnostics v_deleted_assignments = ROW_COUNT;

  delete from app.tenant_members tm
  where tm.tenant_id = p_company_id
    and tm.user_id = p_user_id;

  get diagnostics v_deleted_members = ROW_COUNT;

  if v_deleted_members = 0 then
    raise exception 'Company user not found';
  end if;

  return jsonb_build_object(
    'ok', true,
    'company_id', p_company_id,
    'user_id', p_user_id,
    'deleted_memberships', v_deleted_members,
    'deleted_assignments', v_deleted_assignments
  );
end;
$$;

grant execute on function public.get_company_users(uuid) to authenticated;
grant execute on function public.remove_company_user(uuid, uuid) to authenticated;
