-- Metadata CRUD Simulation
-- Verifies: helper function, RLS write policies, audit triggers, workspace CRUD

with checks as (
  -- 1. Helper function exists
  select '1.1' as check_id,
    case when exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid where n.nspname = 'app' and p.proname = 'current_user_has_manage_metadata')
    then 'PASS' else 'FAIL' end as status,
    'current_user_has_manage_metadata helper exists' as description

  union all

  -- 2. Write policies exist on each metadata table
  select '2.1',
    case when (select count(*) from pg_policies where schemaname = 'app' and tablename like 'erp_%' and cmd = 'INSERT' and policyname not like '%blocked%' and policyname not like '%read%') = 14 then 'PASS' else 'FAIL' end,
    'INSERT policies on all 14 erp_* tables' as description

  union all
  select '2.2',
    case when (select count(*) from pg_policies where schemaname = 'app' and tablename like 'erp_%' and cmd = 'UPDATE' and policyname not like '%blocked%' and policyname not like '%read%') = 14 then 'PASS' else 'FAIL' end,
    'UPDATE policies on all 14 erp_* tables'

  union all
  select '2.3',
    case when (select count(*) from pg_policies where schemaname = 'app' and tablename like 'erp_%' and cmd = 'DELETE' and policyname not like '%blocked%' and policyname not like '%read%') = 14 then 'PASS' else 'FAIL' end,
    'DELETE policies on all 14 erp_* tables'

  union all

  -- 3. No old blocked policies remain
  select '3.1',
    case when (select count(*) from pg_policies where schemaname = 'app' and tablename like 'erp_%' and policyname like '%blocked%') = 0 then 'PASS' else 'FAIL' end,
    'No *_blocked policies remain'

  union all

  -- 4. Audit triggers on all metadata tables
  select '4.1',
    case when (select count(*) from information_schema.triggers where trigger_schema = 'app' and event_object_table like 'erp_%') = 36 then 'PASS' else 'FAIL' end,
    'Audit triggers for INSERT/UPDATE/DELETE on 12 core tables'

  union all

  -- 5. Audit trigger function exists
  select '5.1',
    case when exists (select 1 from pg_proc p join pg_namespace n on p.pronamespace = n.oid where n.nspname = 'app' and p.proname = 'metadata_audit_trigger')
    then 'PASS' else 'FAIL' end,
    'metadata_audit_trigger function exists'

  union all

  -- 6. Audit logs INSERT policy
  select '6.1',
    case when exists (select 1 from pg_policies where schemaname = 'app' and tablename = 'erp_audit_logs' and cmd = 'INSERT' and policyname = 'manage_metadata insert audit_logs')
    then 'PASS' else 'FAIL' end,
    'manage_metadata insert policy on erp_audit_logs'

  union all

  -- 7. Change requests write policies
  select '7.1',
    case when exists (select 1 from pg_policies where schemaname = 'app' and tablename = 'erp_metadata_change_requests' and cmd = 'INSERT')
      and exists (select 1 from pg_policies where schemaname = 'app' and tablename = 'erp_metadata_change_requests' and cmd = 'UPDATE')
      and exists (select 1 from pg_policies where schemaname = 'app' and tablename = 'erp_metadata_change_requests' and cmd = 'DELETE')
    then 'PASS' else 'FAIL' end,
    'Write policies on erp_metadata_change_requests'

  union all

  -- 8. Workspace tables have manage_metadata-gated policies
  select '8.1',
    case when exists (select 1 from pg_policies where schemaname = 'app' and tablename = 'erp_workspaces' and cmd = 'INSERT' and policyname = 'manage_metadata insert workspaces')
      and exists (select 1 from pg_policies where schemaname = 'app' and tablename = 'erp_workspace_items' and cmd = 'INSERT' and policyname = 'manage_metadata insert workspace_items')
    then 'PASS' else 'FAIL' end,
    'manage_metadata-gated INSERT policies on workspace tables'
)
select * from checks order by check_id;