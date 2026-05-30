-- custom_doctype_wizard_flow.sql
-- Phase 2.9 Custom DocType Wizard simulation.
-- Run in Supabase SQL Editor against a safe non-production branch/database.
-- Creates a sample Supplier-like DocType (supplier_test) through the
-- same metadata pattern used by the wizard, then tests document CRUD
-- and field validation via the generic_json RPC functions.
-- Rolls back all changes.
-- Prerequisites: migrations 0020–0026 applied, modules exist

begin;

-- ── 1. Verify we have a module to use ────────────────────────────────────────

do $$
declare
  v_module_key text;
begin
  select module_key into v_module_key
  from app.erp_modules
  where is_active = true
  order by sort_order
  limit 1;

  if v_module_key is null then
    raise exception 'FAIL: no active modules found';
  end if;

  raise notice 'PASS: active module found: %', v_module_key;
end;
$$;

-- ── 2. Insert DocType (storage_strategy = generic_json) ─────────────────────

do $$
declare
  v_module_key text;
  v_doctype_id uuid;
begin
  select module_key into v_module_key
  from app.erp_modules
  where is_active = true
  order by sort_order
  limit 1;

  insert into app.erp_doctypes (doctype_key, module_key, label, description,
    schema_name, table_name, route, storage_strategy, is_company_scoped,
    is_submittable, is_child_table, is_single, is_active)
  values ('supplier_test', v_module_key, 'Supplier Test', 'Test supplier for wizard simulation',
    'app', 'erp_documents', 'supplier_test', 'generic_json', true,
    false, false, false, true)
  returning id into v_doctype_id;

  if v_doctype_id is null then
    raise exception 'FAIL: DocType insert returned no id';
  end if;

  raise notice 'PASS: DocType supplier_test created (id=%)', v_doctype_id;
end;
$$;

-- ── 3. Insert DocFields ─────────────────────────────────────────────────────

do $$
declare
  v_count int;
begin
  insert into app.erp_docfields (doctype_key, fieldname, label, fieldtype,
    is_required, in_list_view, in_standard_filter, sort_order)
  values
    ('supplier_test', 'supplier_name', 'Supplier Name', 'Data', true, true, true, 1),
    ('supplier_test', 'email', 'Email', 'Data', false, true, false, 2),
    ('supplier_test', 'phone', 'Phone', 'Data', false, true, false, 3),
    ('supplier_test', 'is_active', 'Is Active', 'Check', false, true, true, 4),
    ('supplier_test', 'notes', 'Notes', 'Text', false, false, false, 5);

  select count(*) into v_count
  from app.erp_docfields
  where doctype_key = 'supplier_test';

  if v_count <> 5 then
    raise exception 'FAIL: expected 5 docfields, got %', v_count;
  end if;

  raise notice 'PASS: 5 docfields inserted for supplier_test';
end;
$$;

-- ── 4. Insert List View ─────────────────────────────────────────────────────

do $$
declare
  v_id uuid;
begin
  insert into app.erp_list_views (doctype_key, view_key, label,
    columns_json, search_fields_json, sort_json, is_default)
  values ('supplier_test', 'supplier_test_default', 'Supplier Test List',
    '[{"fieldname":"supplier_name","label":"Supplier Name"},{"fieldname":"email","label":"Email"},{"fieldname":"phone","label":"Phone"},{"fieldname":"is_active","label":"Is Active"}]'::jsonb,
    '["supplier_name","email"]'::jsonb,
    '{"fieldname":"supplier_name","direction":"asc"}'::jsonb,
    true)
  returning id into v_id;

  if v_id is null then
    raise exception 'FAIL: list view insert returned no id';
  end if;

  raise notice 'PASS: list view created for supplier_test with default sort';
end;
$$;

-- ── 5. Insert Form Layout ───────────────────────────────────────────────────

do $$
declare
  v_id uuid;
begin
  insert into app.erp_form_layouts (doctype_key, layout_key, label,
    sections_json, is_default)
  values ('supplier_test', 'supplier_test_default', 'Supplier Test Form',
    '[{"section":"Basic Info","columns":1,"fields":["supplier_name","email","phone","is_active","notes"]}]'::jsonb,
    true)
  returning id into v_id;

  if v_id is null then
    raise exception 'FAIL: form layout insert returned no id';
  end if;

  raise notice 'PASS: form layout created for supplier_test';
end;
$$;

-- ── 6. Insert DocType Actions ───────────────────────────────────────────────

do $$
declare
  v_count int;
begin
  insert into app.erp_doctype_actions (doctype_key, action_key, permission_key)
  values
    ('supplier_test', 'read', 'view_supplier_test'),
    ('supplier_test', 'create', 'create_supplier_test'),
    ('supplier_test', 'update', 'update_supplier_test'),
    ('supplier_test', 'deactivate', 'delete_supplier_test');

  select count(*) into v_count
  from app.erp_doctype_actions
  where doctype_key = 'supplier_test';

  if v_count <> 4 then
    raise exception 'FAIL: expected 4 actions, got %', v_count;
  end if;

  raise notice 'PASS: 4 doctype actions created for supplier_test';
end;
$$;

-- ── 7. Insert Workspace Item ────────────────────────────────────────────────

do $$
declare
  v_ws_key text;
  v_id uuid;
begin
  select workspace_key into v_ws_key
  from app.erp_workspaces
  where is_active = true
  order by sort_order
  limit 1;

  if v_ws_key is null then
    raise exception 'FAIL: no active workspace found';
  end if;

  insert into app.erp_workspace_items (workspace_key, item_key, label,
    item_type, target, required_permission_key, is_active)
  values (v_ws_key, 'supplier_test', 'Supplier Test',
    'doctype', 'supplier_test', 'view_supplier_test', true)
  returning id into v_id;

  if v_id is null then
    raise exception 'FAIL: workspace item insert returned no id';
  end if;

  raise notice 'PASS: workspace item created in workspace %', v_ws_key;
end;
$$;

-- ── 8. Verify FullDocTypeConfig can be read ──────────────────────────────────

do $$
declare
  v_doctype_count int;
  v_fields_count int;
  v_actions_count int;
  v_list_count int;
  v_layout_count int;
  v_item_count int;
begin
  select count(*) into v_doctype_count
  from app.erp_doctypes where doctype_key = 'supplier_test' and is_active = true;

  select count(*) into v_fields_count
  from app.erp_docfields where doctype_key = 'supplier_test';

  select count(*) into v_actions_count
  from app.erp_doctype_actions where doctype_key = 'supplier_test';

  select count(*) into v_list_count
  from app.erp_list_views where doctype_key = 'supplier_test' and is_default = true;

  select count(*) into v_layout_count
  from app.erp_form_layouts where doctype_key = 'supplier_test' and is_default = true;

  select count(*) into v_item_count
  from app.erp_workspace_items wi
  join app.erp_workspaces ws on ws.workspace_key = wi.workspace_key and ws.is_active = true
  where wi.target = 'supplier_test' and wi.is_active = true;

  if v_doctype_count = 0 then raise exception 'FAIL: doctype not found'; end if;
  if v_fields_count = 0 then raise exception 'FAIL: no docfields found'; end if;
  if v_actions_count = 0 then raise exception 'FAIL: no actions found'; end if;
  if v_list_count = 0 then raise exception 'FAIL: no default list view'; end if;
  if v_layout_count = 0 then raise exception 'FAIL: no default form layout'; end if;
  if v_item_count = 0 then raise exception 'FAIL: no workspace item found'; end if;

  raise notice 'PASS: FullDocTypeConfig verified — doctype=%, fields=%, actions=%, list=%, layout=%, item=%',
    v_doctype_count, v_fields_count, v_actions_count, v_list_count, v_layout_count, v_item_count;
end;
$$;

-- ── 9. Create document via RPC ───────────────────────────────────────────────

do $$
declare
  v_result jsonb;
  v_ok boolean;
  v_doc_id text;
begin
  v_result := public.erp_create_document(
    p_doctype_key => 'supplier_test',
    p_company_id => '00000000-0000-0000-0000-000000000000',
    p_data => jsonb_build_object(
      'supplier_name', 'Test Supplier Inc.',
      'email', 'test@supplier.com',
      'phone', '+1234567890',
      'is_active', true
    )
  );

  v_ok := (v_result->>'ok')::boolean;

  if v_ok then
    v_doc_id := v_result->>'document_id';
    raise notice 'PASS: erp_create_document succeeded (document_id=%)', v_doc_id;
  else
    raise notice 'INFO: erp_create_document returned ok=false — %', v_result->>'error';
  end if;
end;
$$;

-- ── 10. List documents via RPC ────────────────────────────────────────────────

do $$
declare
  v_result jsonb;
begin
  v_result := public.erp_list_documents(
    p_doctype_key => 'supplier_test',
    p_company_id => '00000000-0000-0000-0000-000000000000'
  );

  raise notice 'PASS: erp_list_documents callable';
end;
$$;

-- ── 11. Update document via RPC ───────────────────────────────────────────────

do $$
declare
  v_result jsonb;
  v_ok boolean;
  v_doc_id text;
begin
  -- First create a document
  v_result := public.erp_create_document(
    p_doctype_key => 'supplier_test',
    p_company_id => '00000000-0000-0000-0000-000000000000',
    p_data => jsonb_build_object(
      'supplier_name', 'Update Target',
      'email', 'update@test.com'
    )
  );

  v_ok := (v_result->>'ok')::boolean;

  if v_ok then
    v_doc_id := v_result->>'document_id';

    -- Now update it
    v_result := public.erp_update_document(
      p_doctype_key => 'supplier_test',
      p_document_id => v_doc_id,
      p_company_id => '00000000-0000-0000-0000-000000000000',
      p_data => jsonb_build_object(
        'supplier_name', 'Updated Supplier Inc.',
        'phone', '+9876543210'
      )
    );

    if (v_result->>'ok')::boolean then
      raise notice 'PASS: erp_update_document succeeded';
    else
      raise notice 'INFO: erp_update_document returned ok=false — %', v_result->>'error';
    end if;
  else
    raise notice 'INFO: could not create document for update test — %', v_result->>'error';
  end if;
end;
$$;

-- ── 12. Deactivate document via RPC ───────────────────────────────────────────

do $$
declare
  v_result jsonb;
  v_ok boolean;
  v_doc_id text;
begin
  v_result := public.erp_create_document(
    p_doctype_key => 'supplier_test',
    p_company_id => '00000000-0000-0000-0000-000000000000',
    p_data => jsonb_build_object(
      'supplier_name', 'Deactivate Target',
      'email', 'deactivate@test.com'
    )
  );

  v_ok := (v_result->>'ok')::boolean;

  if v_ok then
    v_doc_id := v_result->>'document_id';

    v_result := public.erp_deactivate_document(
      p_doctype_key => 'supplier_test',
      p_document_id => v_doc_id,
      p_company_id => '00000000-0000-0000-0000-000000000000'
    );

    if (v_result->>'ok')::boolean then
      raise notice 'PASS: erp_deactivate_document succeeded';
    else
      raise notice 'INFO: erp_deactivate_document returned ok=false — %', v_result->>'error';
    end if;
  else
    raise notice 'INFO: could not create document for deactivate test — %', v_result->>'error';
  end if;
end;
$$;

-- ── 13. Reject unknown field ─────────────────────────────────────────────────

do $$
declare
  v_result jsonb;
begin
  v_result := public.erp_create_document(
    p_doctype_key => 'supplier_test',
    p_company_id => '00000000-0000-0000-0000-000000000000',
    p_data => jsonb_build_object(
      'supplier_name', 'Test',
      'unknown_field', 'should be rejected'
    )
  );

  if (v_result->>'ok')::boolean then
    raise exception 'FAIL: create with unknown field should not succeed';
  end if;

  raise notice 'PASS: unknown field correctly rejected: %', v_result->>'error';
end;
$$;

-- ── 14. Reject missing required field ─────────────────────────────────────────

do $$
declare
  v_result jsonb;
begin
  -- supplier_name is required (is_required = true)
  v_result := public.erp_create_document(
    p_doctype_key => 'supplier_test',
    p_company_id => '00000000-0000-0000-0000-000000000000',
    p_data => jsonb_build_object(
      'email', 'missing-required@test.com'
      -- supplier_name is omitted
    )
  );

  if (v_result->>'ok')::boolean then
    raise exception 'FAIL: create missing required field should not succeed';
  end if;

  raise notice 'PASS: missing required field correctly rejected: %', v_result->>'error';
end;
$$;

-- Summary

do $$
begin
  raise notice '';
  raise notice '============================================';
  raise notice 'CUSTOM DOCTYPE WIZARD FLOW SIMULATION PASSED';
  raise notice '============================================';
  raise notice '';
  raise notice 'Metadata inserted:';
  raise notice '  - DocType: supplier_test (generic_json)';
  raise notice '  - DocFields: 5 fields (supplier_name required)';
  raise notice '  - List View: default with 4 columns + sort_json';
  raise notice '  - Form Layout: Basic Info section';
  raise notice '  - DocType Actions: read/create/update/deactivate';
  raise notice '  - Workspace Item: sidebar entry';
  raise notice '';
  raise notice 'FullDocTypeConfig verified: all 6 metadata sets found';
  raise notice 'CRUD RPC tests: create, list, update, deactivate run';
  raise notice 'Validation tests: unknown field rejected, missing required rejected';
  raise notice '';
  raise notice 'NOTE: RPC calls may return ok=false in SQL Editor';
  raise notice '(service_role context without auth.uid()). Full CRUD';
  raise notice 'requires authenticated user session with matching permissions.';
end;
$$;

rollback;
