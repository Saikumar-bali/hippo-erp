-- warehouse_hierarchy_flow.sql
-- Phase 3: Warehouse Hierarchy simulation.
-- Tests all 6 generic_json DocTypes, hierarchy creation, CRUD, permissions.
-- Rolls back all changes.

begin;

-- ── 1. Verify module is active ───────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from app.erp_modules
    where module_key = 'warehouse' and is_active = true
  ) then
    raise exception 'FAIL: warehouse module not active';
  end if;
  raise notice 'PASS: warehouse module is active';
end;
$$;

-- ── 2. Verify 6 DocTypes exist ───────────────────────────────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.erp_doctypes
  where doctype_key in ('warehouse','warehouse_zone','warehouse_aisle','warehouse_rack','warehouse_shelf','warehouse_bin')
    and storage_strategy = 'generic_json';
  if v_count != 6 then
    raise exception 'FAIL: expected 6 generic_json DocTypes, found %', v_count;
  end if;
  raise notice 'PASS: all 6 generic_json DocTypes exist (%)', v_count;
end;
$$;

-- ── 3. Verify DocFields per DocType ──────────────────────────────────────────

do $$
declare
  v_count int;
begin
  -- warehouse: 4 fields
  select count(*) into v_count from app.erp_docfields where doctype_key = 'warehouse';
  if v_count != 4 then raise exception 'FAIL: warehouse fields expected 4, got %', v_count; end if;

  -- warehouse_zone: 4 fields
  select count(*) into v_count from app.erp_docfields where doctype_key = 'warehouse_zone';
  if v_count != 4 then raise exception 'FAIL: warehouse_zone fields expected 4, got %', v_count; end if;

  -- warehouse_aisle: 4 fields
  select count(*) into v_count from app.erp_docfields where doctype_key = 'warehouse_aisle';
  if v_count != 4 then raise exception 'FAIL: warehouse_aisle fields expected 4, got %', v_count; end if;

  -- warehouse_rack: 4 fields
  select count(*) into v_count from app.erp_docfields where doctype_key = 'warehouse_rack';
  if v_count != 4 then raise exception 'FAIL: warehouse_rack fields expected 4, got %', v_count; end if;

  -- warehouse_shelf: 4 fields
  select count(*) into v_count from app.erp_docfields where doctype_key = 'warehouse_shelf';
  if v_count != 4 then raise exception 'FAIL: warehouse_shelf fields expected 4, got %', v_count; end if;

  -- warehouse_bin: 5 fields
  select count(*) into v_count from app.erp_docfields where doctype_key = 'warehouse_bin';
  if v_count != 5 then raise exception 'FAIL: warehouse_bin fields expected 5, got %', v_count; end if;

  raise notice 'PASS: all DocFields verified';
end;
$$;

-- ── 4. Verify List Views exist ───────────────────────────────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.erp_list_views
  where doctype_key in ('warehouse','warehouse_zone','warehouse_aisle','warehouse_rack','warehouse_shelf','warehouse_bin');
  if v_count != 6 then
    raise exception 'FAIL: expected 6 list views, found %', v_count;
  end if;
  raise notice 'PASS: all 6 list views exist';
end;
$$;

-- ── 5. Verify Form Layouts exist ─────────────────────────────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.erp_form_layouts
  where doctype_key in ('warehouse','warehouse_zone','warehouse_aisle','warehouse_rack','warehouse_shelf','warehouse_bin');
  if v_count != 6 then
    raise exception 'FAIL: expected 6 form layouts, found %', v_count;
  end if;
  raise notice 'PASS: all 6 form layouts exist';
end;
$$;

-- ── 6. Verify DocType Actions (4 per DocType × 6 = 24) ──────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.erp_doctype_actions
  where doctype_key in ('warehouse','warehouse_zone','warehouse_aisle','warehouse_rack','warehouse_shelf','warehouse_bin');
  if v_count != 24 then
    raise exception 'FAIL: expected 24 actions, found %', v_count;
  end if;
  raise notice 'PASS: all 24 doctype actions exist';
end;
$$;

-- ── 7. Verify Workspace Items ────────────────────────────────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.erp_workspace_items
  where workspace_key = 'warehouse'
    and item_key in ('warehouse','warehouse_zone','warehouse_aisle','warehouse_rack','warehouse_shelf','warehouse_bin')
    and is_active = true;
  if v_count != 6 then
    raise exception 'FAIL: expected 6 workspace items, found %', v_count;
  end if;
  raise notice 'PASS: all 6 workspace items exist under warehouse workspace';
end;
$$;

-- ── 8. Verify Permission Keys in Catalog ─────────────────────────────────────

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from app.permissions
  where permission_key like 'view_warehouse%'
     or permission_key like 'create_warehouse%'
     or permission_key like 'update_warehouse%'
     or permission_key like 'delete_warehouse%';
  if v_count < 24 then
    raise exception 'FAIL: expected at least 24 warehouse permission keys, found %', v_count;
  end if;
  raise notice 'PASS: warehouse permission keys exist (%)', v_count;
end;
$$;

-- ── 9. CRUD: Create full hierarchy ───────────────────────────────────────────

do $$
declare
  v_company_id uuid;
  v_warehouse_id uuid;
  v_zone_id uuid;
  v_aisle_id uuid;
  v_rack_id uuid;
  v_shelf_id uuid;
  v_bin_id uuid;
  v_result jsonb;
  v_list jsonb;
  v_ok boolean;
begin
  -- Get first company
  select id into v_company_id from app.tenants limit 1;
  if v_company_id is null then raise exception 'FAIL: no company found'; end if;

  -- 9a. Create Warehouse
  v_result := public.erp_create_document(
    'warehouse',
    v_company_id,
    '{"warehouse_code":"MAIN-WH","warehouse_name":"Main Warehouse","address":"123 Storage St","is_active":true}'::jsonb
  );
  if not (v_result->>'ok')::boolean then raise exception 'FAIL: create warehouse: %', v_result->>'error'; end if;
  v_warehouse_id := (v_result->>'document_id')::uuid;
  if v_warehouse_id is null then raise exception 'FAIL: warehouse_id is null'; end if;
  raise notice 'PASS: Warehouse created (id=%)', v_warehouse_id;

  -- 9b. Create Zone
  v_result := public.erp_create_document(
    'warehouse_zone',
    v_company_id,
    jsonb_build_object('zone_code','RAW-ZONE','zone_name','Raw Materials Zone','warehouse',v_warehouse_id::text,'is_active',true)
  );
  if not (v_result->>'ok')::boolean then raise exception 'FAIL: create zone: %', v_result->>'error'; end if;
  v_zone_id := (v_result->>'document_id')::uuid;
  raise notice 'PASS: Zone created (id=%)', v_zone_id;

  -- 9c. Create Aisle
  v_result := public.erp_create_document(
    'warehouse_aisle',
    v_company_id,
    jsonb_build_object('aisle_code','A-01','aisle_name','Aisle 1','warehouse_zone',v_zone_id::text,'is_active',true)
  );
  if not (v_result->>'ok')::boolean then raise exception 'FAIL: create aisle: %', v_result->>'error'; end if;
  v_aisle_id := (v_result->>'document_id')::uuid;
  raise notice 'PASS: Aisle created (id=%)', v_aisle_id;

  -- 9d. Create Rack
  v_result := public.erp_create_document(
    'warehouse_rack',
    v_company_id,
    jsonb_build_object('rack_code','R-001','rack_name','Rack 1','warehouse_aisle',v_aisle_id::text,'is_active',true)
  );
  if not (v_result->>'ok')::boolean then raise exception 'FAIL: create rack: %', v_result->>'error'; end if;
  v_rack_id := (v_result->>'document_id')::uuid;
  raise notice 'PASS: Rack created (id=%)', v_rack_id;

  -- 9e. Create Shelf
  v_result := public.erp_create_document(
    'warehouse_shelf',
    v_company_id,
    jsonb_build_object('shelf_code','S-001','shelf_name','Shelf 1','warehouse_rack',v_rack_id::text,'is_active',true)
  );
  if not (v_result->>'ok')::boolean then raise exception 'FAIL: create shelf: %', v_result->>'error'; end if;
  v_shelf_id := (v_result->>'document_id')::uuid;
  raise notice 'PASS: Shelf created (id=%)', v_shelf_id;

  -- 9f. Create Bin
  v_result := public.erp_create_document(
    'warehouse_bin',
    v_company_id,
    jsonb_build_object('bin_code','BIN-001','bin_name','Bin 1','warehouse_shelf',v_shelf_id::text,'capacity',100.0,'is_active',true)
  );
  if not (v_result->>'ok')::boolean then raise exception 'FAIL: create bin: %', v_result->>'error'; end if;
  v_bin_id := (v_result->>'document_id')::uuid;
  raise notice 'PASS: Bin created (id=%)', v_bin_id;

  -- 9g. List bins
  v_list := public.erp_list_documents('warehouse_bin', v_company_id);
  if jsonb_array_length(v_list->'data') < 1 then
    raise exception 'FAIL: list bins returned no results';
  end if;
  raise notice 'PASS: List bins returned % result(s)', jsonb_array_length(v_list->'data');

  -- 9h. Update bin capacity
  v_result := public.erp_update_document(
    'warehouse_bin', v_bin_id, v_company_id,
    '{"capacity":250.0}'::jsonb
  );
  if not (v_result->>'ok')::boolean then raise exception 'FAIL: update bin: %', v_result->>'error'; end if;
  raise notice 'PASS: Bin capacity updated';

  -- 9i. Verify update took effect
  v_result := public.erp_get_document('warehouse_bin', v_bin_id, v_company_id);
  if (v_result->'data'->>'capacity')::numeric != 250.0 then
    raise exception 'FAIL: bin capacity not updated, got %', v_result->'data'->>'capacity';
  end if;
  raise notice 'PASS: Bin capacity verified as 250';

  -- 9j. Deactivate bin
  v_result := public.erp_deactivate_document('warehouse_bin', v_bin_id, v_company_id);
  if not (v_result->>'ok')::boolean then raise exception 'FAIL: deactivate bin: %', v_result->>'error'; end if;
  raise notice 'PASS: Bin deactivated';

  -- 9k. Verify deactivation - should not appear in active list
  v_list := public.erp_list_documents('warehouse_bin', v_company_id);
  if jsonb_array_length(v_list->'data') != 0 then
    raise exception 'FAIL: deactivated bin still appears in active list';
  end if;
  raise notice 'PASS: Bin correctly excluded from active list';

  -- 9l. Verify deactivation - should appear with include_inactive
  v_list := public.erp_list_documents('warehouse_bin', v_company_id);
  -- (include_inactive is not supported by the RPC, so we skip that check)

  raise notice 'PASS: Full hierarchy CRUD verified';
end;
$$;

-- ── 10. Verify Link field options ────────────────────────────────────────────

do $$
declare
  v_opts jsonb;
begin
  select options into v_opts from app.erp_docfields
  where doctype_key = 'warehouse_zone' and fieldname = 'warehouse';
  if v_opts is null or v_opts->>'link_to' != 'warehouse' then
    raise exception 'FAIL: warehouse_zone.warehouse link_to not set correctly: %', v_opts;
  end if;

  select options into v_opts from app.erp_docfields
  where doctype_key = 'warehouse_bin' and fieldname = 'warehouse_shelf';
  if v_opts is null or v_opts->>'link_to' != 'warehouse_shelf' then
    raise exception 'FAIL: warehouse_bin.warehouse_shelf link_to not set correctly: %', v_opts;
  end if;

  raise notice 'PASS: Link field options verified';
end;
$$;

-- ── 11. Verify permission grants to owner/admin ──────────────────────────────

do $$
declare
  v_count int;
begin
  -- Count distinct warehouse permissions granted to owner/admin roles
  select count(distinct crp.permission_key) into v_count
  from app.company_role_permissions crp
  join app.company_roles cr on crp.role_id = cr.id
  where cr.role_key in ('owner', 'admin')
    and crp.permission_key like 'view_warehouse%';
  if v_count < 6 then
    raise exception 'FAIL: expected at least 6 distinct view_warehouse* grants to owner/admin, found %', v_count;
  end if;
  raise notice 'PASS: Permission grants to owner/admin verified (%)', v_count;
end;
$$;

-- ── 12. Verify old workspace items removed ───────────────────────────────────

do $$
declare
  v_exists boolean;
begin
  select exists(
    select 1 from app.erp_workspace_items
    where workspace_key = 'warehouse' and item_key in ('warehouses', 'zones')
  ) into v_exists;
  if v_exists then
    raise exception 'FAIL: old workspace items warehouses/zones still exist';
  end if;
  raise notice 'PASS: old workspace items removed';
end;
$$;

rollback;
