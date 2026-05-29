create or replace function public.provision_company_invited_user(
  p_company_id uuid,
  p_caller_user_id uuid,
  p_invited_user_id uuid,
  p_full_name text,
  p_email text,
  p_membership_role text,
  p_company_role_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_role app.company_roles%rowtype;
begin
  if p_company_id is null then
    raise exception 'Company is required';
  end if;

  if p_caller_user_id is null then
    raise exception 'Caller is required';
  end if;

  if p_invited_user_id is null then
    raise exception 'Invited user is required';
  end if;

  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Full name is required';
  end if;

  if coalesce(trim(p_email), '') = '' then
    raise exception 'Email is required';
  end if;

  if not (p_membership_role = any (array['owner','admin','warehouse_manager','stock_operator','viewer','auditor'])) then
    raise exception 'Invalid membership role';
  end if;

  if not exists (
    select 1
    from app.tenant_members tm
    where tm.tenant_id = p_company_id
      and tm.user_id = p_caller_user_id
      and tm.is_active = true
      and tm.role in ('owner', 'admin')
  ) then
    raise exception 'Only company owner/admin can invite users.';
  end if;

  insert into app.profiles (id, full_name, email)
  values (p_invited_user_id, p_full_name, lower(trim(p_email)))
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      updated_at = now();

  insert into app.tenant_members (tenant_id, user_id, role, is_active)
  values (p_company_id, p_invited_user_id, p_membership_role::app.role_type, true)
  on conflict (tenant_id, user_id) do update
  set role = excluded.role,
      is_active = excluded.is_active,
      updated_at = now();

  if p_company_role_id is not null then
    select *
    into v_role
    from app.company_roles
    where id = p_company_role_id
      and tenant_id = p_company_id
      and is_active = true;

    if not found then
      raise exception 'Selected company role does not belong to this company.';
    end if;

    insert into app.company_role_assignments (role_id, user_id, is_active)
    values (p_company_role_id, p_invited_user_id, true)
    on conflict (role_id, user_id) do update
    set is_active = true,
        updated_at = now();
  end if;

  return jsonb_build_object(
    'ok', true,
    'company_id', p_company_id,
    'user_id', p_invited_user_id,
    'email', lower(trim(p_email)),
    'full_name', p_full_name,
    'membership_role', p_membership_role,
    'company_role_id', p_company_role_id
  );
end;
$$;

grant execute on function public.provision_company_invited_user(uuid, uuid, uuid, text, text, text, uuid) to authenticated;
