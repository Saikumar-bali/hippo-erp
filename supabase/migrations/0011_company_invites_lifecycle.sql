create table if not exists app.company_invites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  invited_by uuid not null references app.profiles(id) on delete restrict,
  full_name text not null,
  email text not null,
  membership_role app.role_type not null,
  company_role_id uuid references app.company_roles(id) on delete set null,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted', 'cancelled')),
  auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  cancelled_at timestamptz
);

create unique index if not exists company_invites_company_email_key
  on app.company_invites (tenant_id, email);

alter table app.company_invites enable row level security;

create or replace function public.get_company_invites(p_company_id uuid)
returns table (
  invite_id uuid,
  full_name text,
  email text,
  membership_role text,
  invite_status text,
  company_role_id uuid,
  company_role_name text,
  invited_by_name text,
  created_at timestamptz,
  updated_at timestamptz,
  accepted_at timestamptz,
  cancelled_at timestamptz
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select
    i.id as invite_id,
    i.full_name,
    i.email,
    i.membership_role::text as membership_role,
    i.invite_status,
    i.company_role_id,
    r.role_name as company_role_name,
    coalesce(p.full_name, p.email, '') as invited_by_name,
    i.created_at,
    i.updated_at,
    i.accepted_at,
    i.cancelled_at
  from app.company_invites i
  left join app.company_roles r on r.id = i.company_role_id
  left join app.profiles p on p.id = i.invited_by
  where i.tenant_id = p_company_id
    and i.invite_status = 'pending'
  order by i.created_at desc;
$$;

create or replace function public.create_company_invite(
  p_company_id uuid,
  p_invited_by_user_id uuid,
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
  v_invite app.company_invites%rowtype;
begin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    raise exception 'Only company owner/admin can invite users.';
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

  insert into app.company_invites (
    tenant_id,
    invited_by,
    full_name,
    email,
    membership_role,
    company_role_id,
    invite_status,
    auth_user_id,
    created_at,
    updated_at,
    accepted_at,
    cancelled_at
  )
  values (
    p_company_id,
    p_invited_by_user_id,
    trim(p_full_name),
    lower(trim(p_email)),
    p_membership_role::app.role_type,
    p_company_role_id,
    'pending',
    null,
    now(),
    now(),
    null,
    null
  )
  on conflict (tenant_id, email) do update
  set invited_by = excluded.invited_by,
      full_name = excluded.full_name,
      membership_role = excluded.membership_role,
      company_role_id = excluded.company_role_id,
      invite_status = 'pending',
      auth_user_id = null,
      updated_at = now(),
      accepted_at = null,
      cancelled_at = null
  returning * into v_invite;

  return jsonb_build_object(
    'ok', true,
    'invite_id', v_invite.id,
    'company_id', v_invite.tenant_id,
    'email', v_invite.email,
    'full_name', v_invite.full_name,
    'membership_role', v_invite.membership_role::text,
    'company_role_id', v_invite.company_role_id,
    'invite_status', v_invite.invite_status
  );
end;
$$;

create or replace function public.accept_company_invite(
  p_company_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invite app.company_invites%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_user_email
  from auth.users
  where id = v_user_id;

  if v_user_email is null then
    raise exception 'Unable to read authenticated email';
  end if;

  select *
  into v_invite
  from app.company_invites
  where lower(email) = lower(v_user_email)
    and invite_status = 'pending'
    and (p_company_id is null or tenant_id = p_company_id)
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'No pending invitation found for this account';
  end if;

  insert into app.profiles (id, full_name, email)
  values (v_user_id, v_invite.full_name, lower(v_user_email))
  on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      updated_at = now();

  insert into app.tenant_members (tenant_id, user_id, role, is_active)
  values (v_invite.tenant_id, v_user_id, v_invite.membership_role, true)
  on conflict (tenant_id, user_id) do update
  set role = excluded.role,
      is_active = true,
      updated_at = now();

  if v_invite.company_role_id is not null then
    insert into app.company_role_assignments (role_id, user_id, is_active)
    values (v_invite.company_role_id, v_user_id, true)
    on conflict (role_id, user_id) do update
    set is_active = true,
        updated_at = now();
  end if;

  update app.company_invites
  set invite_status = 'accepted',
      accepted_at = now(),
      updated_at = now(),
      auth_user_id = v_user_id
  where id = v_invite.id;

  return jsonb_build_object(
    'ok', true,
    'company_id', v_invite.tenant_id,
    'email', v_user_email,
    'full_name', v_invite.full_name,
    'membership_role', v_invite.membership_role::text,
    'company_role_id', v_invite.company_role_id,
    'invite_id', v_invite.id
  );
end;
$$;

create or replace function public.deactivate_company_user(
  p_company_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, app, auth
as $$
begin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    raise exception 'Only company owner/admin can manage users.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot deactivate your own account from this screen.';
  end if;

  update app.tenant_members
  set is_active = false,
      updated_at = now()
  where tenant_id = p_company_id
    and user_id = p_user_id;

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

  return jsonb_build_object('ok', true, 'company_id', p_company_id, 'user_id', p_user_id);
end;
$$;

create or replace function public.cancel_company_invite(
  p_company_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_invite_id uuid;
begin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    raise exception 'Only company owner/admin can manage invites.';
  end if;

  select id
  into v_invite_id
  from app.company_invites
  where tenant_id = p_company_id
    and lower(email) = lower(trim(p_email))
    and invite_status = 'pending'
  order by created_at desc
  limit 1;

  if v_invite_id is null then
    raise exception 'Pending invite not found';
  end if;

  update app.company_invites
  set invite_status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  where id = v_invite_id;

  return jsonb_build_object('ok', true, 'company_id', p_company_id, 'email', lower(trim(p_email)));
end;
$$;

grant execute on function public.get_company_invites(uuid) to authenticated;
grant execute on function public.create_company_invite(uuid, uuid, text, text, text, uuid) to authenticated;
grant execute on function public.accept_company_invite(uuid) to authenticated;
grant execute on function public.deactivate_company_user(uuid, uuid) to authenticated;
grant execute on function public.cancel_company_invite(uuid, text) to authenticated;
