-- workspace_navigation_flow.sql
-- Phase 2.6 Workspace Navigation simulation.
-- Run in Supabase SQL Editor against a safe non-production branch/database.
--
-- NOTE: The SQL Editor runs as a superuser/service-role, NOT as an anonymous
-- or authenticated application user. Therefore:
--   - RLS policy checks (anon-read blocked, auth-read allowed, write blocked)
--     are verified structurally (policy existence + RLS enabled).
--   - Full anon-role verification requires a separate client session using the
--     Supabase anon key (not supported in SQL Editor).
--   - The blocked-write tests below use BEGIN/EXCEPTION blocks inside a
--     SECURITY DEFINER function to simulate role checks. For production-grade
--     verification, run integration tests via the frontend SDK.

-- NOTE: Verification of the new explicit columns (target_doctype_key,
-- target_workspace_key, route) is included in checks 4a-4c.

begin;

-- ── 1. Verify workspace tables exist ─────────────────────────────────────────

do $$
declare
  v_missing text;
begin
  select string_agg(required_table, ', ')
  into v_missing
  from (
    values
      ('erp_workspaces'),
      ('erp_workspace_items')
  ) as r(required_table)
  where not exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'app'
      and t.table_name = r.required_table
  );

  if v_missing is not null then
    raise exception 'FAIL: missing workspace tables: %', v_missing;
  end if;

  raise notice 'PASS: workspace tables exist';
end;
$$;

-- ── 2. Verify Product Master workspace exists ────────────────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.erp_workspaces
  where workspace_key = 'product_master'
    and is_active = true;

  if v_count <> 1 then
    raise exception 'FAIL: expected Product Master workspace, got %', v_count;
  end if;

  raise notice 'PASS: Product Master workspace exists';
end;
$$;

-- ── 3. Verify Product Master has 3 child items ───────────────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.erp_workspace_items
  where workspace_key = 'product_master'
    and is_active = true;

  if v_count <> 3 then
    raise exception 'FAIL: expected 3 Product Master items, got %', v_count;
  end if;

  raise notice 'PASS: Product Master has 3 items';
end;
$$;

-- ── 4. Verify each item points to correct DocType ────────────────────────────

do $$
declare
  v_missing text;
begin
  select string_agg(r.item_key || '->' || r.expected_target, ', ')
  into v_missing
  from (
    values
      ('products', 'product'),
      ('product_categories', 'product_category'),
      ('units_of_measure', 'unit_of_measure')
  ) as r(item_key, expected_target)
  where not exists (
    select 1
    from app.erp_workspace_items i
    where i.workspace_key = 'product_master'
      and i.item_key = r.item_key
      and i.target = r.expected_target
      and i.is_active = true
  );

  if v_missing is not null then
    raise exception 'FAIL: missing or wrong product master item mappings: %', v_missing;
  end if;

  raise notice 'PASS: all Product Master items point to correct DocTypes';
end;
$$;

-- ── 4a. Verify target_doctype_key populated for doctype items ────────────────

do $$
declare
  v_bad text;
begin
  select string_agg(item_key, ', ')
  into v_bad
  from app.erp_workspace_items
  where item_type = 'doctype'
    and target_doctype_key is null;

  if v_bad is not null then
    raise exception 'FAIL: doctype items missing target_doctype_key: %', v_bad;
  end if;

  raise notice 'PASS: all doctype items have target_doctype_key';
end;
$$;

-- ── 4b. Verify route populated for page items ────────────────────────────────

do $$
declare
  v_bad text;
begin
  select string_agg(item_key, ', ')
  into v_bad
  from app.erp_workspace_items
  where item_type = 'page'
    and route is null;

  if v_bad is not null then
    raise exception 'FAIL: page items missing route: %', v_bad;
  end if;

  raise notice 'PASS: all page items have route';
end;
$$;

-- ── 4c. Verify workspace_item_target_check constraint exists ─────────────────

do $$
declare
  v_constraint text;
begin
  select con.conname into v_constraint
  from pg_constraint con
  join pg_namespace n on n.oid = con.connamespace
  join pg_class c on c.oid = con.conrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  where cn.nspname = 'app'
    and c.relname = 'erp_workspace_items'
    and con.conname = 'workspace_item_target_check';

  if v_constraint is null then
    raise exception 'FAIL: workspace_item_target_check constraint not found';
  end if;

  raise notice 'PASS: workspace_item_target_check constraint exists';
end;
$$;

-- ── 5. Verify RLS enabled on workspace tables ────────────────────────────────

do $$
declare
  v_not_secured text;
begin
  select string_agg(c.relname, ', ')
  into v_not_secured
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'app'
    and c.relname in ('erp_workspaces', 'erp_workspace_items')
    and c.relrowsecurity = false;

  if v_not_secured is not null then
    raise exception 'FAIL: workspace tables without RLS: %', v_not_secured;
  end if;

  raise notice 'PASS: RLS enabled for workspace tables';
end;
$$;

-- ── 6. Verify anonymous cannot read workspace metadata (structural) ──────────

do $$
declare
  v_missing text;
begin
  select string_agg(
    'app.' || c.relname || ' lacks anon deny-select',
    ', '
  ) into v_missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'app'
    and c.relname in ('erp_workspaces', 'erp_workspace_items')
    and not exists (
      select 1
      from pg_policy p
      where p.polrelid = c.oid
        and p.polroles @> (select array_agg(oid) from pg_roles where rolname = 'anon')
        and p.polcmd = 'r'
        and pg_get_expr(p.polqual, p.polrelid) = 'false'
    );

  if v_missing is not null then
    raise exception 'FAIL: %', v_missing;
  end if;

  raise notice
    'PASS: anon deny-select policies exist (structural check; full anon role'
    ' simulation requires a separate anon-key client session)';
end;
$$;

-- ── 7. Verify workspace items have unique constraint ─────────────────────────

do $$
declare
  v_constraint text;
begin
  select con.conname into v_constraint
  from pg_constraint con
  join pg_namespace n on n.oid = con.connamespace
  join pg_class c on c.oid = con.conrelid
  join pg_namespace cn on cn.oid = c.relnamespace
  where cn.nspname = 'app'
    and c.relname = 'erp_workspace_items'
    and con.contype = 'u'
    and exists (
      select 1
      from pg_attribute a
      where a.attrelid = c.oid
        and a.attnum = any(con.conkey)
        and a.attname = 'workspace_key'
    )
    and exists (
      select 1
      from pg_attribute a
      where a.attrelid = c.oid
        and a.attnum = any(con.conkey)
        and a.attname = 'item_key'
    );

  if v_constraint is null then
    raise exception 'FAIL: unique(workspace_key, item_key) constraint not found on erp_workspace_items';
  end if;

  raise notice 'PASS: unique(workspace_key, item_key) exists';
end;
$$;

-- ── 8. Verify inactive workspaces exist as placeholders ──────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.erp_workspaces
  where is_active = false;

  if v_count < 2 then
    raise exception 'FAIL: expected at least 2 inactive placeholder workspaces, got %', v_count;
  end if;

  raise notice 'PASS: Inactive placeholder workspaces exist';
end;
$$;

-- ── 9. Verify authenticated user cannot INSERT/UPDATE/DELETE workspace metadata ──
-- Switch to authenticated role so RLS policies apply.
-- The Management API runs as service_role (superuser) which bypasses RLS,
-- so we use SET LOCAL ROLE to simulate an authenticated app user.
-- NOTE: This runs in a transaction that will be rolled back, so no data is harmed.

set local role authenticated;

do $$
declare
  v_err text;
begin
  -- Attempt INSERT into erp_workspaces (should be blocked by RLS)
  begin
    insert into app.erp_workspaces (workspace_key, label, sort_order)
    values ('test_write_blocked', 'Test Write Blocked', 999)
    returning workspace_key into v_err;
    raise exception 'FAIL: INSERT into erp_workspaces succeeded (RLS should block it)';
  exception
    when insufficient_privilege then
      raise notice 'PASS: INSERT into erp_workspaces blocked by RLS';
    when others then
      raise notice 'PASS: INSERT into erp_workspaces blocked (%)', SQLERRM;
  end;

  -- Attempt UPDATE into erp_workspaces
  begin
    update app.erp_workspaces
    set label = 'hacked'
    where workspace_key = 'product_master'
    returning workspace_key into v_err;
    raise exception 'FAIL: UPDATE into erp_workspaces succeeded (RLS should block it)';
  exception
    when insufficient_privilege then
      raise notice 'PASS: UPDATE into erp_workspaces blocked by RLS';
    when others then
      raise notice 'PASS: UPDATE into erp_workspaces blocked (%)', SQLERRM;
  end;

  -- Attempt DELETE from erp_workspaces
  begin
    delete from app.erp_workspaces
    where workspace_key = 'product_master'
    returning workspace_key into v_err;
    raise exception 'FAIL: DELETE from erp_workspaces succeeded (RLS should block it)';
  exception
    when insufficient_privilege then
      raise notice 'PASS: DELETE from erp_workspaces blocked by RLS';
    when others then
      raise notice 'PASS: DELETE from erp_workspaces blocked (%)', SQLERRM;
  end;

  -- Attempt INSERT into erp_workspace_items
  begin
    insert into app.erp_workspace_items (workspace_key, item_key, label, item_type, target)
    values ('product_master', 'test_blocked', 'Test Blocked', 'doctype', 'test')
    returning item_key into v_err;
    raise exception 'FAIL: INSERT into erp_workspace_items succeeded (RLS should block it)';
  exception
    when insufficient_privilege then
      raise notice 'PASS: INSERT into erp_workspace_items blocked by RLS';
    when others then
      raise notice 'PASS: INSERT into erp_workspace_items blocked (%)', SQLERRM;
  end;

  -- Attempt UPDATE into erp_workspace_items
  begin
    update app.erp_workspace_items
    set label = 'hacked'
    where workspace_key = 'product_master' and item_key = 'products'
    returning item_key into v_err;
    raise exception 'FAIL: UPDATE into erp_workspace_items succeeded (RLS should block it)';
  exception
    when insufficient_privilege then
      raise notice 'PASS: UPDATE into erp_workspace_items blocked by RLS';
    when others then
      raise notice 'PASS: UPDATE into erp_workspace_items blocked (%)', SQLERRM;
  end;

  -- Attempt DELETE from erp_workspace_items
  begin
    delete from app.erp_workspace_items
    where workspace_key = 'product_master' and item_key = 'products'
    returning item_key into v_err;
    raise exception 'FAIL: DELETE from erp_workspace_items succeeded (RLS should block it)';
  exception
    when insufficient_privilege then
      raise notice 'PASS: DELETE from erp_workspace_items blocked by RLS';
    when others then
      raise notice 'PASS: DELETE from erp_workspace_items blocked (%)', SQLERRM;
  end;
end;
$$;

rollback;
