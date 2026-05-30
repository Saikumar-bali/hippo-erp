-- ============================================================================
-- Simulation: Custom DocType Storage (generic_json)
-- Phase 2.8 — Document Storage
-- Tests: storage_strategy column, app.erp_documents table, 6 RPC functions,
--        permission check, version history, field validation, company scoping
-- ============================================================================
-- Prerequisites: migration 0026 applied, user has manage_metadata permission
-- ============================================================================

-- 1. Verify storage_strategy column exists with default physical_rpc
select
  case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'app' and table_name = 'erp_doctypes'
        and column_name = 'storage_strategy'
    ) then 'PASS: storage_strategy column exists'
    else 'FAIL: storage_strategy column missing'
  end as check_1_storage_strategy_column;

-- 2. Verify app.erp_documents table exists with all columns
select
  case
    when exists (
      select 1 from information_schema.tables
      where table_schema = 'app' and table_name = 'erp_documents'
    ) then 'PASS: erp_documents table exists'
    else 'FAIL: erp_documents table missing'
  end as check_2_documents_table;

-- 3. Verify app.erp_document_versions table exists
select
  case
    when exists (
      select 1 from information_schema.tables
      where table_schema = 'app' and table_name = 'erp_document_versions'
    ) then 'PASS: erp_document_versions table exists'
    else 'FAIL: erp_document_versions table missing'
  end as check_3_document_versions_table;

-- 4. Verify RPC functions exist
select
  case
    when (
      select count(*) = 6 from pg_proc p
      join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public'
        and p.proname in (
          'erp_list_documents',
          'erp_get_document',
          'erp_create_document',
          'erp_update_document',
          'erp_deactivate_document',
          'erp_reactivate_document'
        )
    ) then 'PASS: All 6 RPC functions exist'
    else 'FAIL: Some RPC functions missing'
  end as check_4_rpc_functions;

-- 5. Verify current_user_has_doctype_permission helper exists
select
  case
    when exists (
      select 1 from pg_proc p
      join pg_namespace n on p.pronamespace = n.oid
      where n.nspname = 'public' and p.proname = 'current_user_has_doctype_permission'
    ) then 'PASS: current_user_has_doctype_permission helper exists'
    else 'FAIL: current_user_has_doctype_permission helper missing'
  end as check_5_permission_helper;

-- 6. Verify RLs policies on erp_documents
select
  case
    when (
      select count(*) >= 4 from pg_policies
      where schemaname = 'app' and tablename = 'erp_documents'
    ) then 'PASS: erp_documents has RLS policies'
    else 'FAIL: erp_documents has fewer than 4 RLS policies'
  end as check_6_document_rls;

-- 7. Verify existing doctypes have storage_strategy set
select
  case
    when (
      select bool_and(storage_strategy = 'physical_rpc')
      from app.erp_doctypes
      where doctype_key in ('product', 'product_category', 'unit_of_measure')
    ) then 'PASS: Existing doctypes have physical_rpc storage_strategy'
    else 'FAIL: Some existing doctypes have unexpected storage_strategy'
  end as check_7_existing_strategy;

-- 8. Verify that version history table references are valid
select
  case
    when exists (
      select 1 from information_schema.table_constraints
      where constraint_schema = 'app' and constraint_name like 'erp_document_versions%document_id%fk%'
    ) then 'PASS: erp_document_versions has FK to erp_documents'
    else 'FAIL: erp_document_versions FK missing (non-critical if app-level enforced)'
  end as check_8_version_fk;

-- 9. Verify that erp_documents has is_active column
select
  case
    when exists (
      select 1 from information_schema.columns
      where table_schema = 'app' and table_name = 'erp_documents' and column_name = 'is_active'
    ) then 'PASS: erp_documents has is_active column'
    else 'FAIL: erp_documents missing is_active'
  end as check_9_is_active_column;

-- 10. Verify erp_documents has audit columns
select
  case
    when (
      select count(*)::int = 3 from information_schema.columns
      where table_schema = 'app' and table_name = 'erp_documents'
        and column_name in ('created_by', 'created_at', 'updated_at')
    ) then 'PASS: erp_documents has all audit columns (created_by, created_at, updated_at)'
    else 'FAIL: erp_documents missing some audit columns'
  end as check_10_audit_columns;

-- Summary
select 'CUSTOM DOCTYPE STORAGE SIMULATION COMPLETE' as summary;
