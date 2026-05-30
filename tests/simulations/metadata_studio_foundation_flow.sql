-- metadata_studio_foundation_flow.sql
-- Phase 2.7: Metadata Studio foundation simulation.
-- Run in Supabase SQL Editor against the production branch.
-- This transaction rolls back — no data is harmed.

begin;

-- ── 1. Verify manage_metadata permission exists ──────────────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.permissions
  where permission_key = 'manage_metadata';

  if v_count = 0 then
    raise exception 'FAIL: manage_metadata permission not found';
  end if;

  raise notice 'PASS: manage_metadata permission exists';
end;
$$;

-- ── 2. Verify manage_metadata granted to owner and admin ─────────────────────

do $$
declare
  v_missing text;
begin
  select string_agg(role::text, ', ')
  into v_missing
  from (
    values ('owner'::app.role_type), ('admin'::app.role_type)
  ) as r(role)
  where not exists (
    select 1
    from app.role_permission_grants g
    where g.role = r.role
      and g.permission_key = 'manage_metadata'
      and g.is_granted = true
  );

  if v_missing is not null then
    raise exception 'FAIL: manage_metadata not granted to roles: %', v_missing;
  end if;

  raise notice 'PASS: manage_metadata granted to owner and admin';
end;
$$;

-- ── 3. Verify audit_logs table exists ────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'app' and table_name = 'erp_audit_logs'
  ) then
    raise exception 'FAIL: erp_audit_logs table does not exist';
  end if;
  raise notice 'PASS: erp_audit_logs table exists';
end;
$$;

-- ── 4. Verify metadata_change_requests table exists ──────────────────────────

do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'app' and table_name = 'erp_metadata_change_requests'
  ) then
    raise exception 'FAIL: erp_metadata_change_requests table does not exist';
  end if;
  raise notice 'PASS: erp_metadata_change_requests table exists';
end;
$$;

-- ── 5. Verify RLS enabled on audit_logs ──────────────────────────────────────

do $$
declare
  v_rls boolean;
begin
  select c.relrowsecurity into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'app' and c.relname = 'erp_audit_logs';

  if v_rls is distinct from true then
    raise exception 'FAIL: RLS not enabled on erp_audit_logs';
  end if;
  raise notice 'PASS: RLS enabled on erp_audit_logs';
end;
$$;

-- ── 6. Verify RLS enabled on metadata_change_requests ────────────────────────

do $$
declare
  v_rls boolean;
begin
  select c.relrowsecurity into v_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'app' and c.relname = 'erp_metadata_change_requests';

  if v_rls is distinct from true then
    raise exception 'FAIL: RLS not enabled on erp_metadata_change_requests';
  end if;
  raise notice 'PASS: RLS enabled on erp_metadata_change_requests';
end;
$$;

-- ── 7. Verify Metadata Studio workspace exists ───────────────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.erp_workspaces
  where workspace_key = 'metadata_studio'
    and is_active = true;

  if v_count = 0 then
    raise exception 'FAIL: Metadata Studio workspace not found or not active';
  end if;
  raise notice 'PASS: Metadata Studio workspace exists and is active';
end;
$$;

-- ── 8. Verify Metadata Studio has child items ────────────────────────────────

do $$
declare
  v_count int;
  v_missing text;
begin
  select count(*) into v_count
  from app.erp_workspace_items
  where workspace_key = 'metadata_studio'
    and is_active = true;

  if v_count < 4 then
    raise exception 'FAIL: expected at least 4 Metadata Studio items, got %', v_count;
  end if;

  select string_agg(r.expected_key, ', ')
  into v_missing
  from (
    values
      ('metadata_studio_doctypes'),
      ('metadata_studio_docfields'),
      ('metadata_studio_list_views'),
      ('metadata_studio_form_layouts')
  ) as r(expected_key)
  where not exists (
    select 1
    from app.erp_workspace_items i
    where i.workspace_key = 'metadata_studio'
      and i.item_key = r.expected_key
      and i.is_active = true
  );

  if v_missing is not null then
    raise exception 'FAIL: missing Metadata Studio items: %', v_missing;
  end if;

  raise notice 'PASS: Metadata Studio has % items with all required entries', v_count;
end;
$$;

-- ── 9. Verify Metadata Studio items require manage_metadata ──────────────────

do $$
declare
  v_bad text;
begin
  select string_agg(item_key, ', ')
  into v_bad
  from app.erp_workspace_items
  where workspace_key = 'metadata_studio'
    and (required_permission_key is distinct from 'manage_metadata');

  if v_bad is not null then
    raise exception 'FAIL: Metadata Studio items missing manage_metadata permission: %', v_bad;
  end if;

  raise notice 'PASS: All Metadata Studio items require manage_metadata';
end;
$$;

rollback;
