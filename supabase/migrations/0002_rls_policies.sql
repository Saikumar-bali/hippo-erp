create or replace function app.current_user_is_tenant_member(tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = app, auth, public
as $$
  select exists (
    select 1 from app.tenant_members tm
    where tm.tenant_id = tenant
      and tm.user_id = auth.uid()
      and tm.is_active = true
  );
$$;

create or replace function app.current_user_has_tenant_role(tenant uuid, roles text[])
returns boolean
language sql
stable
security definer
set search_path = app, auth, public
as $$
  select exists (
    select 1 from app.tenant_members tm
    where tm.tenant_id = tenant
      and tm.user_id = auth.uid()
      and tm.is_active = true
      and tm.role::text = any(roles)
  );
$$;

create or replace function app.current_tenant_roles(tenant uuid)
returns text[]
language sql
stable
set search_path = app, auth, public
as $$
  select coalesce(array_agg(tm.role::text), '{}'::text[])
  from app.tenant_members tm
  where tm.tenant_id = tenant and tm.user_id = auth.uid() and tm.is_active = true;
$$;

alter table app.tenants enable row level security;
alter table app.profiles enable row level security;
alter table app.tenant_members enable row level security;

do $$
declare r record;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'wh'
  loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
  end loop;
end $$;

-- app schema policies
create policy profiles_self_read on app.profiles for select using (id = auth.uid());
create policy profiles_self_update on app.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy tenant_members_read on app.tenant_members
for select
using (user_id = auth.uid() or app.current_user_has_tenant_role(tenant_id, array['owner','admin']));

create policy tenant_members_manage on app.tenant_members
for all
using (app.current_user_has_tenant_role(tenant_id, array['owner','admin']))
with check (app.current_user_has_tenant_role(tenant_id, array['owner','admin']));

create policy tenant_read on app.tenants
for select
using (app.current_user_is_tenant_member(id));

create policy tenant_manage on app.tenants
for update
using (app.current_user_has_tenant_role(id, array['owner','admin']))
with check (app.current_user_has_tenant_role(id, array['owner','admin']));

-- wh schema policies
create or replace function private.apply_wh_policies()
returns void
language plpgsql
set search_path = private, wh, app, public
as $$
declare t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'wh'
  loop
    execute format('drop policy if exists %I_member_select on wh.%I', t.tablename, t.tablename);
    execute format('drop policy if exists %I_operator_write on wh.%I', t.tablename, t.tablename);
    execute format('drop policy if exists %I_owner_delete on wh.%I', t.tablename, t.tablename);

    execute format(
      'create policy %I_member_select on wh.%I for select using (app.current_user_is_tenant_member(tenant_id))',
      t.tablename, t.tablename
    );

    execute format(
      'create policy %I_operator_write on wh.%I for insert, update with check (app.current_user_has_tenant_role(tenant_id, array[''owner'',''admin'',''warehouse_manager'',''stock_operator'']))',
      t.tablename, t.tablename
    );

    execute format(
      'create policy %I_owner_delete on wh.%I for delete using (app.current_user_has_tenant_role(tenant_id, array[''owner'',''admin'',''warehouse_manager'']))',
      t.tablename, t.tablename
    );
  end loop;
end;
$$;

select private.apply_wh_policies();

-- grants
revoke all on schema app from anon;
revoke all on schema wh from anon;
revoke all on all tables in schema app from anon;
revoke all on all tables in schema wh from anon;

grant usage on schema app to authenticated;
grant usage on schema wh to authenticated;
grant select, insert, update on all tables in schema app to authenticated;
grant select, insert, update, delete on all tables in schema wh to authenticated;

alter default privileges in schema app grant select, insert, update on tables to authenticated;
alter default privileges in schema wh grant select, insert, update, delete on tables to authenticated;
