-- Phase 6.4: framework core completion gate.
-- Fix role-management RPC ambiguity and align permission UX foundations.

create or replace function public.save_company_role(p_payload jsonb)
returns table (
  id uuid,
  tenant_id uuid,
  role_key text,
  role_name text,
  description text,
  is_system boolean,
  is_active boolean,
  sort_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_role_id uuid := nullif(trim(p_payload->>'id'), '')::uuid;
  v_tenant_id uuid := (p_payload->>'tenant_id')::uuid;
  v_role_key text := nullif(lower(regexp_replace(coalesce(p_payload->>'role_key', ''), '[^a-zA-Z0-9]+', '_', 'g')), '');
  v_role_name text := nullif(trim(p_payload->>'role_name'), '');
  v_description text := nullif(trim(p_payload->>'description'), '');
  v_sort_order integer := coalesce((p_payload->>'sort_order')::integer, 0);
  v_permission_keys text[] := coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'permission_keys', '[]'::jsonb))), '{}'::text[]);
  v_is_system boolean := coalesce((p_payload->>'is_system')::boolean, false);
  v_role app.company_roles%rowtype;
begin
  if not app.current_user_has_tenant_role(v_tenant_id, array['owner','admin']) then
    raise exception 'Not authorized to manage company roles';
  end if;

  if v_role_name is null then
    raise exception 'Role name is required';
  end if;

  if v_role_key is null then
    v_role_key := lower(regexp_replace(v_role_name, '[^a-zA-Z0-9]+', '_', 'g'));
  end if;

  if v_role_id is null then
    insert into app.company_roles (tenant_id, role_key, role_name, description, is_system, is_active, sort_order)
    values (v_tenant_id, v_role_key, v_role_name, v_description, v_is_system, true, v_sort_order)
    returning * into v_role;
  else
    update app.company_roles as r
    set
      role_key = v_role_key,
      role_name = v_role_name,
      description = v_description,
      sort_order = v_sort_order,
      updated_at = now()
    where r.id = v_role_id
    returning * into v_role;
  end if;

  delete from app.company_role_permissions as rp
  where rp.role_id = v_role.id;

  insert into app.company_role_permissions (role_id, permission_key, is_granted)
  select v_role.id, p.permission_key, true
  from unnest(v_permission_keys) as p(permission_key)
  on conflict (role_id, permission_key) do update
  set is_granted = excluded.is_granted, updated_at = now();

  return query
  select
    r.id,
    r.tenant_id,
    r.role_key,
    r.role_name,
    r.description,
    r.is_system,
    r.is_active,
    r.sort_order,
    r.created_at,
    r.updated_at
  from app.company_roles as r
  where r.id = v_role.id;
end;
$$;

create or replace function public.delete_company_role(p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_role app.company_roles%rowtype;
  v_assignment_count bigint;
begin
  select *
  into v_role
  from app.company_roles as r
  where r.id = p_role_id;

  if not found then
    raise exception 'Role not found';
  end if;

  if not app.current_user_has_tenant_role(v_role.tenant_id, array['owner','admin']) then
    raise exception 'Not authorized to delete company roles';
  end if;

  if v_role.is_system then
    raise exception 'System roles cannot be deleted';
  end if;

  select count(*)
  into v_assignment_count
  from app.company_role_assignments as ra
  where ra.role_id = p_role_id
    and ra.is_active = true;

  if v_assignment_count > 0 then
    raise exception 'Role has active user assignments';
  end if;

  delete from app.company_roles as r
  where r.id = p_role_id;
end;
$$;
