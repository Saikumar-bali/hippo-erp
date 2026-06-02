-- manual_doctype_completion_flow.sql
-- Phase 4.7: Simulate creating an incomplete DocType and repairing it via metadata.
-- Tests: detection of missing pieces, permission/key grant, list/form/workspace repair.
-- Rolls back all changes.

begin;

do $$
declare
  v_doctype_key text := 'test_repair_demo';
  v_module_key text := 'purchasing';
  v_field_id uuid;
  v_list_id uuid;
  v_layout_id uuid;
  v_action_id uuid;
  v_perm_count int;
begin
  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 1: Create a minimal DocType (intentionally incomplete)
  -- ═══════════════════════════════════════════════════════════════════════════

  insert into app.erp_doctypes (doctype_key, module_key, label, schema_name, table_name, route, storage_strategy, is_company_scoped)
  values (v_doctype_key, v_module_key, 'Test Repair Demo', 'app', 'erp_documents', v_doctype_key, 'generic_json', true);

  if not exists (select 1 from app.erp_doctypes where doctype_key = v_doctype_key) then
    raise exception 'FAIL: DocType not created';
  end if;
  raise notice 'PASS: TEST 1 — DocType created';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 2: Verify missing pieces are detectable
  -- ═══════════════════════════════════════════════════════════════════════════

  -- No fields
  if exists (select 1 from app.erp_docfields where doctype_key = v_doctype_key) then
    raise exception 'FAIL: Fields should not exist yet';
  end if;
  raise notice 'PASS: TEST 2 — Fields correctly absent';

  -- No list view
  if exists (select 1 from app.erp_list_views where doctype_key = v_doctype_key) then
    raise exception 'FAIL: List view should not exist yet';
  end if;
  raise notice 'PASS: TEST 2 — List view correctly absent';

  -- No form layout
  if exists (select 1 from app.erp_form_layouts where doctype_key = v_doctype_key) then
    raise exception 'FAIL: Form layout should not exist yet';
  end if;
  raise notice 'PASS: TEST 2 — Form layout correctly absent';

  -- No actions
  if exists (select 1 from app.erp_doctype_actions where doctype_key = v_doctype_key) then
    raise exception 'FAIL: Actions should not exist yet';
  end if;
  raise notice 'PASS: TEST 2 — Actions correctly absent';

  -- No permissions
  select count(*) into v_perm_count
  from app.permissions
  where permission_key in ('view_test_repair_demo', 'create_test_repair_demo', 'update_test_repair_demo', 'delete_test_repair_demo');
  if v_perm_count > 0 then
    raise exception 'FAIL: Permissions should not exist yet';
  end if;
  raise notice 'PASS: TEST 2 — Permissions correctly absent';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 3: Add fields (simulating repair)
  -- ═══════════════════════════════════════════════════════════════════════════

  insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype, is_required, in_list_view, sort_order)
  values
    (v_doctype_key, 'title', 'Title', 'Data', true, true, 1),
    (v_doctype_key, 'amount', 'Amount', 'Float', true, true, 2),
    (v_doctype_key, 'status', 'Status', 'Select', true, true, 3);

  select count(*) into v_perm_count from app.erp_docfields where doctype_key = v_doctype_key;
  if v_perm_count != 3 then
    raise exception 'FAIL: Expected 3 fields, got %', v_perm_count;
  end if;
  raise notice 'PASS: TEST 3 — 3 fields created';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 4: Create list view (simulating repair)
  -- ═══════════════════════════════════════════════════════════════════════════

  insert into app.erp_list_views (doctype_key, view_key, label, columns_json, is_default)
  values (v_doctype_key, 'default', 'Default', '[{"fieldname":"title","label":"Title","width":200},{"fieldname":"amount","label":"Amount","width":120},{"fieldname":"status","label":"Status","width":100}]', true);

  if not exists (select 1 from app.erp_list_views where doctype_key = v_doctype_key and is_default = true) then
    raise exception 'FAIL: List view not created';
  end if;
  raise notice 'PASS: TEST 4 — Default list view created';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 5: Create form layout (simulating repair)
  -- ═══════════════════════════════════════════════════════════════════════════

  insert into app.erp_form_layouts (doctype_key, layout_key, label, sections_json, is_default)
  values (v_doctype_key, 'default', 'Default', '[{"section_label":"Details","columns":[{"fieldname":"title","label":"Title"},{"fieldname":"amount","label":"Amount"},{"fieldname":"status","label":"Status"}]}]', true);

  if not exists (select 1 from app.erp_form_layouts where doctype_key = v_doctype_key and is_default = true) then
    raise exception 'FAIL: Form layout not created';
  end if;
  raise notice 'PASS: TEST 5 — Default form layout created';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 6: Create actions and permissions (simulating repair)
  -- ═══════════════════════════════════════════════════════════════════════════

  insert into app.erp_doctype_actions (doctype_key, action_key, permission_key) values
    (v_doctype_key, 'read', 'view_test_repair_demo'),
    (v_doctype_key, 'create', 'create_test_repair_demo'),
    (v_doctype_key, 'update', 'update_test_repair_demo'),
    (v_doctype_key, 'deactivate', 'delete_test_repair_demo');

  insert into app.permissions (permission_key, module_key, module_label, permission_label, description, sort_order) values
    ('view_test_repair_demo', 'purchasing', 'Purchasing', 'View Test Repair Demo', 'Auto-created', 50),
    ('create_test_repair_demo', 'purchasing', 'Purchasing', 'Create Test Repair Demo', 'Auto-created', 50),
    ('update_test_repair_demo', 'purchasing', 'Purchasing', 'Update Test Repair Demo', 'Auto-created', 50),
    ('delete_test_repair_demo', 'purchasing', 'Purchasing', 'Delete Test Repair Demo', 'Auto-created', 50);

  insert into app.role_permission_grants (role, permission_key, is_granted) values
    ('owner', 'view_test_repair_demo', true),
    ('owner', 'create_test_repair_demo', true),
    ('owner', 'update_test_repair_demo', true),
    ('owner', 'delete_test_repair_demo', true),
    ('admin', 'view_test_repair_demo', true),
    ('admin', 'create_test_repair_demo', true),
    ('admin', 'update_test_repair_demo', true),
    ('admin', 'delete_test_repair_demo', true);

  select count(*) into v_perm_count from app.erp_doctype_actions where doctype_key = v_doctype_key;
  if v_perm_count != 4 then
    raise exception 'FAIL: Expected 4 actions, got %', v_perm_count;
  end if;
  raise notice 'PASS: TEST 6 — % actions + permissions + grants created', v_perm_count;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 7: Create workspace item (simulating repair)
  -- ═══════════════════════════════════════════════════════════════════════════

  insert into app.erp_workspace_items (workspace_key, item_key, label, item_type, target, required_permission_key, is_active, sort_order)
  values ('purchasing', v_doctype_key, 'Test Repair', 'doctype', v_doctype_key, 'view_test_repair_demo', true, 99);

  if not exists (select 1 from app.erp_workspace_items where target = v_doctype_key) then
    raise exception 'FAIL: Workspace item not created';
  end if;
  raise notice 'PASS: TEST 7 — Workspace item created';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 8: Verify diagnostic completeness
  -- ═══════════════════════════════════════════════════════════════════════════

  -- All pieces should now be in place
  if not exists (select 1 from app.erp_doctypes where doctype_key = v_doctype_key) then
    raise exception 'FAIL: DocType missing';
  end if;
  if (select count(*) from app.erp_docfields where doctype_key = v_doctype_key) < 1 then
    raise exception 'FAIL: No fields';
  end if;
  if not exists (select 1 from app.erp_list_views where doctype_key = v_doctype_key and is_default = true) then
    raise exception 'FAIL: No default list view';
  end if;
  if not exists (select 1 from app.erp_form_layouts where doctype_key = v_doctype_key and is_default = true) then
    raise exception 'FAIL: No default form layout';
  end if;
  if (select count(*) from app.erp_doctype_actions where doctype_key = v_doctype_key) < 4 then
    raise exception 'FAIL: Insufficient actions';
  end if;
  if not exists (select 1 from app.erp_workspace_items where target = v_doctype_key) then
    raise exception 'FAIL: No workspace item';
  end if;
  if not exists (select 1 from app.erp_workspace_items where target = v_doctype_key and is_active = true) then
    raise exception 'FAIL: Workspace item not active';
  end if;

  raise notice 'PASS: TEST 8 — All pieces complete and verifiable';

  raise notice '';
  raise notice '═══════════════════════════════════════════════════';
  raise notice 'ALL TESTS PASSED (8/8)';
  raise notice '═══════════════════════════════════════════════════';
end;
$$;

rollback;
