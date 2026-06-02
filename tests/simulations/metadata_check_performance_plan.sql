-- metadata_check_performance_plan.sql
-- Phase 4.7: Dry-run diagnostic plan for the Check / Repair DocType feature.
-- This does NOT modify any data — it only SELECTs to measure the diagnostic queries.
-- Run in a read-only transaction.
--
-- Usage:
--   supabase db query --file tests/simulations/metadata_check_performance_plan.sql

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- PLAN: Check / Repair DocType — diagnostic queries
-- ═══════════════════════════════════════════════════════════════════════════
-- Each query identifies a specific "broken" aspect of a DocType.

do $$
declare
  v_doctype_key text := 'purchase_invoice';  -- target doctype
  v_severity text;
  v_fix_sql text;
begin
  raise notice '═══════════════════════════════════════════════════';
  raise notice 'DRY-RUN: Check / Repair DocType Performance Plan';
  raise notice 'Target: %', v_doctype_key;
  raise notice '═══════════════════════════════════════════════════';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- CHECK 1: DocType existence
  -- ═══════════════════════════════════════════════════════════════════════════
  if exists (select 1 from app.erp_doctypes where doctype_key = v_doctype_key) then
    raise notice 'CHECK 1 [DocType] ✅ exists';
  else
    raise notice 'CHECK 1 [DocType] ❌ MISSING — fix: INSERT INTO app.erp_doctypes (...)';
  end if;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- CHECK 2: DocFields — at least one field should exist
  -- ═══════════════════════════════════════════════════════════════════════════
  declare
    v_field_count int;
  begin
    select count(*) into v_field_count from app.erp_docfields where doctype_key = v_doctype_key;
    if v_field_count > 0 then
      raise notice 'CHECK 2 [Fields] ✅ % field(s)', v_field_count;
    else
      raise notice 'CHECK 2 [Fields] ❌ MISSING — fix: INSERT INTO app.erp_docfields (...)';
    end if;
  end;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- CHECK 3: Default List View
  -- ═══════════════════════════════════════════════════════════════════════════
  if exists (select 1 from app.erp_list_views where doctype_key = v_doctype_key and is_default = true) then
    raise notice 'CHECK 3 [List View] ✅ default exists';
  else
    raise notice 'CHECK 3 [List View] ❌ MISSING — fix: INSERT INTO app.erp_list_views (...)';
  end if;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- CHECK 4: Default Form Layout
  -- ═══════════════════════════════════════════════════════════════════════════
  if exists (select 1 from app.erp_form_layouts where doctype_key = v_doctype_key and is_default = true) then
    raise notice 'CHECK 4 [Form Layout] ✅ default exists';
  else
    raise notice 'CHECK 4 [Form Layout] ❌ MISSING — fix: INSERT INTO app.erp_form_layouts (...)';
  end if;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- CHECK 5: DocType Actions — expects 4 (read, create, update, deactivate)
  -- ═══════════════════════════════════════════════════════════════════════════
  declare
    v_action_count int;
  begin
    select count(*) into v_action_count from app.erp_doctype_actions where doctype_key = v_doctype_key;
    if v_action_count >= 4 then
      raise notice 'CHECK 5 [Actions] ✅ % actions', v_action_count;
    elsif v_action_count > 0 then
      raise notice 'CHECK 5 [Actions] ⚠️ partial (%/4) — fix: INSERT INTO app.erp_doctype_actions (...)',
        v_action_count;
    else
      raise notice 'CHECK 5 [Actions] ❌ MISSING — fix: INSERT INTO app.erp_doctype_actions (...)';
    end if;
  end;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- CHECK 6: Permission keys in catalog
  -- ═══════════════════════════════════════════════════════════════════════════
  declare
    v_perm_count int;
  begin
    select count(*) into v_perm_count
    from app.permissions
    where permission_key like 'view_' || v_doctype_key
       or permission_key like 'create_' || v_doctype_key
       or permission_key like 'update_' || v_doctype_key
       or permission_key like 'delete_' || v_doctype_key;

    if v_perm_count >= 4 then
      raise notice 'CHECK 6 [Permissions] ✅ % in catalog', v_perm_count;
    elsif v_perm_count > 0 then
      raise notice 'CHECK 6 [Permissions] ⚠️ partial (%/4)', v_perm_count;
    else
      raise notice 'CHECK 6 [Permissions] ❌ MISSING — fix: INSERT INTO app.permissions (...)';
    end if;
  end;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- CHECK 7: Role-permission grants (owner/admin)
  -- ═══════════════════════════════════════════════════════════════════════════
  declare
    v_grant_count int;
  begin
    select count(*) into v_grant_count
    from app.role_permission_grants rpg
    join app.permissions p on p.permission_key = rpg.permission_key
    where p.permission_key like '%' || v_doctype_key
      and rpg.role in ('owner', 'admin')
      and rpg.is_granted = true;

    if v_grant_count >= 8 then
      raise notice 'CHECK 7 [Grants] ✅ % owner+admin grants', v_grant_count;
    elsif v_grant_count > 0 then
      raise notice 'CHECK 7 [Grants] ⚠️ partial (%/8)', v_grant_count;
    else
      raise notice 'CHECK 7 [Grants] ❌ MISSING — fix: INSERT INTO app.role_permission_grants (...)';
    end if;
  end;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- CHECK 8: Workspace Item
  -- ═══════════════════════════════════════════════════════════════════════════
  if exists (select 1 from app.erp_workspace_items where target = v_doctype_key and is_active = true) then
    raise notice 'CHECK 8 [Workspace Item] ✅ active item exists';
  else
    raise notice 'CHECK 8 [Workspace Item] ❌ MISSING — fix: INSERT INTO app.erp_workspace_items (...)';
  end if;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- PERFORMANCE ESTIMATE
  -- ═══════════════════════════════════════════════════════════════════════════
  -- All checks are single-row lookups indexed by doctype_key.
  -- Estimated cost per check: < 0.1ms on 1000 rows.
  -- Total 8 checks → < 1ms for diagnostic.
  -- Fix operations (INSERT) are equally cheap and run only for missing items.

  raise notice '';
  raise notice '═══════════════════════════════════════════════════';
  raise notice 'Estimated cost: <1ms per full check of 8 diagnostics';
  raise notice 'Fix operations: lightweight INSERTs per missing piece';
  raise notice '═══ PLANNED (dry-run) — no data modified';
  raise notice '═══════════════════════════════════════════════════';
end;
$$;

rollback;
