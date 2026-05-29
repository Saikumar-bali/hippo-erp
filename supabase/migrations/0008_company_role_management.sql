create table if not exists app.company_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  role_key text not null,
  role_name text not null,
  description text,
  is_system boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, role_key)
);

create table if not exists app.company_role_permissions (
  role_id uuid not null references app.company_roles(id) on delete cascade,
  permission_key text not null references app.permissions(permission_key) on delete cascade,
  is_granted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table if not exists app.company_role_assignments (
  role_id uuid not null references app.company_roles(id) on delete cascade,
  user_id uuid not null references app.profiles(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_id, user_id)
);

alter table app.company_roles enable row level security;
alter table app.company_role_permissions enable row level security;
alter table app.company_role_assignments enable row level security;

drop policy if exists company_roles_read on app.company_roles;
create policy company_roles_read on app.company_roles
for select
to authenticated
using (app.current_user_is_tenant_member(tenant_id));

drop policy if exists company_roles_manage on app.company_roles;
create policy company_roles_manage on app.company_roles
for all
to authenticated
using (app.current_user_has_tenant_role(tenant_id, array['owner','admin']))
with check (app.current_user_has_tenant_role(tenant_id, array['owner','admin']));

drop policy if exists company_role_permissions_read on app.company_role_permissions;
create policy company_role_permissions_read on app.company_role_permissions
for select
to authenticated
using (
  exists (
    select 1
    from app.company_roles r
    where r.id = role_id
      and app.current_user_is_tenant_member(r.tenant_id)
  )
);

drop policy if exists company_role_permissions_manage on app.company_role_permissions;
create policy company_role_permissions_manage on app.company_role_permissions
for all
to authenticated
using (
  exists (
    select 1
    from app.company_roles r
    where r.id = role_id
      and app.current_user_has_tenant_role(r.tenant_id, array['owner','admin'])
  )
)
with check (
  exists (
    select 1
    from app.company_roles r
    where r.id = role_id
      and app.current_user_has_tenant_role(r.tenant_id, array['owner','admin'])
  )
);

drop policy if exists company_role_assignments_read on app.company_role_assignments;
create policy company_role_assignments_read on app.company_role_assignments
for select
to authenticated
using (
  exists (
    select 1
    from app.company_roles r
    where r.id = role_id
      and app.current_user_is_tenant_member(r.tenant_id)
  )
);

drop policy if exists company_role_assignments_manage on app.company_role_assignments;
create policy company_role_assignments_manage on app.company_role_assignments
for all
to authenticated
using (
  exists (
    select 1
    from app.company_roles r
    where r.id = role_id
      and app.current_user_has_tenant_role(r.tenant_id, array['owner','admin'])
  )
)
with check (
  exists (
    select 1
    from app.company_roles r
    where r.id = role_id
      and app.current_user_has_tenant_role(r.tenant_id, array['owner','admin'])
  )
);

grant select, insert, update, delete on app.company_roles to authenticated;
grant select, insert, update, delete on app.company_role_permissions to authenticated;
grant select, insert, update, delete on app.company_role_assignments to authenticated;

create or replace function public.get_permission_catalog()
returns table (
  permission_key text,
  module_key text,
  module_label text,
  permission_label text,
  description text,
  sort_order integer,
  is_active boolean
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select permission_key, module_key, module_label, permission_label, description, sort_order, is_active
  from app.permissions
  order by module_key, sort_order, permission_key;
$$;

create or replace function public.ensure_company_default_roles(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public, app, auth
as $$
declare
  v_role record;
begin
  if not app.current_user_has_tenant_role(p_company_id, array['owner','admin']) then
    raise exception 'Not authorized to initialize company roles';
  end if;

  insert into app.company_roles (tenant_id, role_key, role_name, description, is_system, is_active, sort_order)
  values
    (p_company_id, 'owner', 'Owner', 'Full company control.', true, true, 10),
    (p_company_id, 'admin', 'Admin', 'Administrative access for the company.', true, true, 20),
    (p_company_id, 'warehouse_manager', 'Warehouse Manager', 'Warehouse and inventory operations access.', true, true, 30),
    (p_company_id, 'stock_operator', 'Stock Operator', 'Operational stock movement access.', true, true, 40),
    (p_company_id, 'viewer', 'Viewer', 'Read-only access for daily review.', true, true, 50),
    (p_company_id, 'auditor', 'Auditor', 'Audit and reporting access.', true, true, 60)
  on conflict (tenant_id, role_key) do update
  set
    role_name = excluded.role_name,
    description = excluded.description,
    is_system = excluded.is_system,
    is_active = true,
    sort_order = excluded.sort_order,
    updated_at = now();

  for v_role in
    select id, role_key
    from app.company_roles
    where tenant_id = p_company_id
      and role_key in ('owner','admin','warehouse_manager','stock_operator','viewer','auditor')
  loop
    delete from app.company_role_permissions where role_id = v_role.id;

    if v_role.role_key in ('owner', 'admin') then
      insert into app.company_role_permissions (role_id, permission_key, is_granted)
      select v_role.id, p.permission_key, true
      from app.permissions p
      on conflict (role_id, permission_key) do update
      set is_granted = excluded.is_granted, updated_at = now();
    elsif v_role.role_key = 'warehouse_manager' then
      insert into app.company_role_permissions (role_id, permission_key, is_granted)
      select v_role.id, p.permission_key, true
      from app.permissions p
      where p.permission_key in (
        'view_company','view_products','create_product','update_product','view_warehouses','create_warehouse','update_warehouse','manage_bins','view_grn','create_grn','update_grn','qc_grn','approve_grn','post_grn','view_stock','view_movements','transfer_stock','adjust_stock','approve_adjustment','reserve_stock','view_reports','export_reports','view_dashboard','submit_document','cancel_document','view_audit_history'
      )
      on conflict (role_id, permission_key) do update
      set is_granted = excluded.is_granted, updated_at = now();
    elsif v_role.role_key = 'stock_operator' then
      insert into app.company_role_permissions (role_id, permission_key, is_granted)
      select v_role.id, p.permission_key, true
      from app.permissions p
      where p.permission_key in (
        'view_company','view_products','view_warehouses','view_grn','create_grn','update_grn','view_stock','view_movements','transfer_stock','adjust_stock','reserve_stock','view_reports','view_dashboard','view_audit_history'
      )
      on conflict (role_id, permission_key) do update
      set is_granted = excluded.is_granted, updated_at = now();
    elsif v_role.role_key = 'viewer' then
      insert into app.company_role_permissions (role_id, permission_key, is_granted)
      select v_role.id, p.permission_key, true
      from app.permissions p
      where p.permission_key in (
        'view_company','view_products','view_warehouses','view_grn','view_stock','view_movements','view_reports','view_dashboard','view_audit_history'
      )
      on conflict (role_id, permission_key) do update
      set is_granted = excluded.is_granted, updated_at = now();
    elsif v_role.role_key = 'auditor' then
      insert into app.company_role_permissions (role_id, permission_key, is_granted)
      select v_role.id, p.permission_key, true
      from app.permissions p
      where p.permission_key in (
        'view_company','view_users','view_roles','view_products','view_warehouses','view_grn','view_stock','view_movements','view_reports','export_reports','view_dashboard','view_audit_history'
      )
      on conflict (role_id, permission_key) do update
      set is_granted = excluded.is_granted, updated_at = now();
    end if;
  end loop;
end;
$$;

create or replace function public.get_company_roles(p_company_id uuid)
returns table (
  id uuid,
  tenant_id uuid,
  role_key text,
  role_name text,
  description text,
  is_system boolean,
  is_active boolean,
  sort_order integer,
  permission_count bigint,
  assignment_count bigint
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select
    r.id,
    r.tenant_id,
    r.role_key,
    r.role_name,
    r.description,
    r.is_system,
    r.is_active,
    r.sort_order,
    coalesce(pc.permission_count, 0) as permission_count,
    coalesce(ac.assignment_count, 0) as assignment_count
  from app.company_roles r
  left join lateral (
    select count(*) as permission_count
    from app.company_role_permissions rp
    where rp.role_id = r.id and rp.is_granted = true
  ) pc on true
  left join lateral (
    select count(*) as assignment_count
    from app.company_role_assignments ra
    where ra.role_id = r.id and ra.is_active = true
  ) ac on true
  where r.tenant_id = p_company_id
  order by r.sort_order, r.role_name;
$$;

create or replace function public.get_company_role_permissions(p_role_id uuid)
returns table (
  permission_key text,
  is_granted boolean
)
language sql
stable
security definer
set search_path = public, app, auth
as $$
  select rp.permission_key, rp.is_granted
  from app.company_role_permissions rp
  where rp.role_id = p_role_id
    and rp.is_granted = true
  order by rp.permission_key;
$$;

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
  v_role record;
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
    update app.company_roles
    set
      role_key = v_role_key,
      role_name = v_role_name,
      description = v_description,
      sort_order = v_sort_order,
      updated_at = now()
    where id = v_role_id
    returning * into v_role;
  end if;

  delete from app.company_role_permissions where role_id = v_role.id;
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
  from app.company_roles r
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
  select * into v_role from app.company_roles where id = p_role_id;
  if not found then
    raise exception 'Role not found';
  end if;

  if not app.current_user_has_tenant_role(v_role.tenant_id, array['owner','admin']) then
    raise exception 'Not authorized to delete company roles';
  end if;

  if v_role.is_system then
    raise exception 'System roles cannot be deleted';
  end if;

  select count(*) into v_assignment_count
  from app.company_role_assignments ra
  where ra.role_id = p_role_id and ra.is_active = true;

  if v_assignment_count > 0 then
    raise exception 'Role has active user assignments';
  end if;

  delete from app.company_roles where id = p_role_id;
end;
$$;

grant execute on function public.get_permission_catalog() to authenticated;
grant execute on function public.ensure_company_default_roles(uuid) to authenticated;
grant execute on function public.get_company_roles(uuid) to authenticated;
grant execute on function public.get_company_role_permissions(uuid) to authenticated;
grant execute on function public.save_company_role(jsonb) to authenticated;
grant execute on function public.delete_company_role(uuid) to authenticated;
