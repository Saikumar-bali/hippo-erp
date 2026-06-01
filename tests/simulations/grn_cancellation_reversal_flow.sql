-- grn_cancellation_reversal_flow.sql
-- Phase 4.6: GRN cancellation/reversal simulation.
-- Tests: create & post GRN, cancel with reason, verify reversal movements,
--        verify current inventory decrement, guard conditions.
-- Rolls back all changes.

begin;

do $$
declare
  v_tenant_id uuid;
  v_cat_id uuid;
  v_uom_id uuid;
  v_product_id uuid;
  v_wh_id uuid;
  v_zone_id uuid;
  v_aisle_id uuid;
  v_rack_id uuid;
  v_shelf_id uuid;
  v_bin_id uuid;
  v_grn_result jsonb;
  v_grn_id uuid;
  v_post_result jsonb;
  v_cancel_result jsonb;
  v_movement_count int;
  v_reversal_count int;
  v_movement record;
  v_original_movement_id uuid;
  v_reversal_movement_id uuid;
  v_ci record;
begin
  -- ── 0. Setup ──────────────────────────────────────────────────────────────

  select id into v_tenant_id from app.tenants limit 1;
  if not found then raise exception 'FAIL: No tenant found'; end if;
  raise notice 'PASS: Using tenant %', v_tenant_id;

  select id into v_cat_id from wh.product_categories where tenant_id = v_tenant_id limit 1;
  if not found then
    insert into wh.product_categories (tenant_id, code, name, created_by)
    values (v_tenant_id, 'TEST_CAT_CNCL', 'Test Category Cancel', (select id from app.profiles limit 1))
    returning id into v_cat_id;
  end if;

  select id into v_uom_id from wh.units_of_measure where tenant_id = v_tenant_id limit 1;
  if not found then
    insert into wh.units_of_measure (tenant_id, code, name, created_by)
    values (v_tenant_id, 'EA', 'Each', (select id from app.profiles limit 1))
    returning id into v_uom_id;
  end if;

  select id into v_product_id from wh.products where tenant_id = v_tenant_id limit 1;
  if not found then
    insert into wh.products (tenant_id, category_id, uom_id, sku, name, batch_tracking, expiry_tracking, created_by)
    values (v_tenant_id, v_cat_id, v_uom_id, 'TEST-CNCL-001', 'Test Cancel Product', true, true,
            (select id from app.profiles limit 1))
    returning id into v_product_id;
  end if;
  raise notice 'PASS: Using product_id %', v_product_id;

  select id into v_wh_id from wh.warehouses where tenant_id = v_tenant_id limit 1;
  if not found then
    insert into wh.warehouses (tenant_id, warehouse_code, name, created_by)
    values (v_tenant_id, 'WH-CNCL', 'Test Warehouse Cancel', (select id from app.profiles limit 1))
    returning id into v_wh_id;
  end if;

  select id into v_zone_id from wh.warehouse_zones where tenant_id = v_tenant_id limit 1;
  if not found then
    insert into wh.warehouse_zones (tenant_id, warehouse_id, zone_code, name)
    values (v_tenant_id, v_wh_id, 'Z-CNCL', 'Test Zone Cancel')
    returning id into v_zone_id;
  end if;

  select id into v_aisle_id from wh.warehouse_aisles where tenant_id = v_tenant_id limit 1;
  if not found then
    insert into wh.warehouse_aisles (tenant_id, zone_id, aisle_code, name)
    values (v_tenant_id, v_zone_id, 'A-CNCL', 'Test Aisle Cancel')
    returning id into v_aisle_id;
  end if;

  select id into v_rack_id from wh.warehouse_racks where tenant_id = v_tenant_id limit 1;
  if not found then
    insert into wh.warehouse_racks (tenant_id, aisle_id, rack_code, name)
    values (v_tenant_id, v_aisle_id, 'R-CNCL', 'Test Rack Cancel')
    returning id into v_rack_id;
  end if;

  select id into v_shelf_id from wh.warehouse_shelves where tenant_id = v_tenant_id limit 1;
  if not found then
    insert into wh.warehouse_shelves (tenant_id, rack_id, shelf_code, name)
    values (v_tenant_id, v_rack_id, 'S-CNCL', 'Test Shelf Cancel')
    returning id into v_shelf_id;
  end if;

  select id into v_bin_id from wh.warehouse_bins where tenant_id = v_tenant_id limit 1;
  if not found then
    insert into wh.warehouse_bins (tenant_id, shelf_id, bin_code, name, capacity)
    values (v_tenant_id, v_shelf_id, 'B-CNCL', 'Test Bin Cancel', 1000)
    returning id into v_bin_id;
  end if;
  raise notice 'PASS: Using bin_id %', v_bin_id;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 1: Create and post GRN
  -- ═══════════════════════════════════════════════════════════════════════════

  v_grn_result := wh_create_grn_draft(
    p_tenant_id => v_tenant_id,
    p_grn_number => 'GRN-CNCL-TEST-001',
    p_supplier_name => 'Cancel Test Supplier',
    p_received_date => current_date,
    p_notes => 'Test GRN for cancellation simulation',
    p_lines => jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id,
      'uom_id', v_uom_id,
      'received_qty', 50,
      'accepted_qty', 40,
      'rejected_qty', 10,
      'batch_number', 'BATCH-CNCL-001',
      'expiry_date', '2027-12-31',
      'bin_id', v_bin_id
    ))
  );

  if not (v_grn_result->>'ok')::boolean then
    raise exception 'FAIL: Create draft GRN failed: %', v_grn_result->>'error';
  end if;
  v_grn_id := (v_grn_result->'data'->>'grn_id')::uuid;
  raise notice 'PASS: TEST 1 — Draft GRN created (id=%)', v_grn_id;

  v_post_result := wh_post_grn(p_grn_id => v_grn_id);
  if not (v_post_result->>'ok')::boolean then
    raise exception 'FAIL: Post GRN failed: %', v_post_result->>'error';
  end if;
  v_movement_count := (v_post_result->'data'->>'movements_created')::int;
  raise notice 'PASS: TEST 1 — GRN posted (movements_created=%)', v_movement_count;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 2: Verify positive GRN_RECEIPT movement exists
  -- ═══════════════════════════════════════════════════════════════════════════

  select count(*) into v_movement_count
  from wh.inventory_movements
  where source_id = v_grn_id and movement_type = 'GRN_RECEIPT';

  if v_movement_count = 0 then
    raise exception 'FAIL: No GRN_RECEIPT movement found';
  end if;
  raise notice 'PASS: TEST 2 — % GRN_RECEIPT movement(s) found', v_movement_count;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 3: Verify current inventory increased
  -- ═══════════════════════════════════════════════════════════════════════════

  select on_hand_qty, available_qty into v_ci
  from wh.current_inventory
  where tenant_id = v_tenant_id and product_id = v_product_id;

  if not found then
    raise exception 'FAIL: No current_inventory row found after posting';
  end if;
  if v_ci.on_hand_qty != 40 or v_ci.available_qty != 40 then
    raise exception 'FAIL: Expected on_hand=40, available=40, got on_hand=%, available=%', v_ci.on_hand_qty, v_ci.available_qty;
  end if;
  raise notice 'PASS: TEST 3 — Current inventory on_hand=%, available=%', v_ci.on_hand_qty, v_ci.available_qty;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 4: Cancel GRN with reason
  -- ═══════════════════════════════════════════════════════════════════════════

  v_cancel_result := wh_cancel_grn(p_grn_id => v_grn_id, p_reason => 'Duplicate receipt — entered by mistake');

  if not (v_cancel_result->>'ok')::boolean then
    raise exception 'FAIL: Cancel GRN failed: %', v_cancel_result->>'error';
  end if;
  v_reversal_count := (v_cancel_result->'data'->>'reversals_created')::int;
  raise notice 'PASS: TEST 4 — GRN cancelled (reversals_created=%)', v_reversal_count;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 5: Verify GRN status = cancelled
  -- ═══════════════════════════════════════════════════════════════════════════

  if (select status from wh.grns where id = v_grn_id) != 'cancelled' then
    raise exception 'FAIL: GRN status is not cancelled';
  end if;

  if (select cancel_reason from wh.grns where id = v_grn_id) != 'Duplicate receipt — entered by mistake' then
    raise exception 'FAIL: Cancel reason not stored correctly';
  end if;

  if (select cancelled_at from wh.grns where id = v_grn_id) is null then
    raise exception 'FAIL: cancelled_at not set';
  end if;
  raise notice 'PASS: TEST 5 — GRN status=cancelled, reason and timestamp stored';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 6: Verify reversal movement exists with negative qty
  -- ═══════════════════════════════════════════════════════════════════════════

  select id, qty_delta, is_reversal, reversal_of_movement_id
  into v_movement
  from wh.inventory_movements
  where source_id = v_grn_id and movement_type = 'REVERSAL'
  limit 1;

  if not found then
    raise exception 'FAIL: No REVERSAL movement found';
  end if;
  v_reversal_movement_id := v_movement.id;

  if v_movement.qty_delta >= 0 then
    raise exception 'FAIL: Reversal qty_delta is not negative: %', v_movement.qty_delta;
  end if;
  if v_movement.qty_delta != -40 then
    raise exception 'FAIL: Expected reversal qty_delta = -40, got %', v_movement.qty_delta;
  end if;
  if v_movement.is_reversal != true then
    raise exception 'FAIL: is_reversal flag not set';
  end if;
  if v_movement.reversal_of_movement_id is null then
    raise exception 'FAIL: reversal_of_movement_id not set';
  end if;
  raise notice 'PASS: TEST 6 — Reversal movement id=%, qty=%, is_reversal=%, reversal_of_movement_id=%',
    v_movement.id, v_movement.qty_delta, v_movement.is_reversal, v_movement.reversal_of_movement_id;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 7: Verify reversal links to original movement
  -- ═══════════════════════════════════════════════════════════════════════════

  select id into v_original_movement_id
  from wh.inventory_movements
  where source_id = v_grn_id and movement_type = 'GRN_RECEIPT'
  limit 1;

  if v_movement.reversal_of_movement_id != v_original_movement_id then
    raise exception 'FAIL: reversal_of_movement_id % does not match original movement %',
      v_movement.reversal_of_movement_id, v_original_movement_id;
  end if;
  raise notice 'PASS: TEST 7 — Reversal links to original movement %', v_original_movement_id;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 8: Verify original movement remains unchanged
  -- ═══════════════════════════════════════════════════════════════════════════

  select qty_delta into v_movement
  from wh.inventory_movements
  where id = v_original_movement_id;

  if v_movement.qty_delta != 40 then
    raise exception 'FAIL: Original movement qty changed: %', v_movement.qty_delta;
  end if;
  raise notice 'PASS: TEST 8 — Original movement unchanged (qty=%)', v_movement.qty_delta;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 9: Verify current inventory reduced back
  -- ═══════════════════════════════════════════════════════════════════════════

  select on_hand_qty, available_qty into v_ci
  from wh.current_inventory
  where tenant_id = v_tenant_id and product_id = v_product_id;

  if v_ci.on_hand_qty != 0 or v_ci.available_qty != 0 then
    raise exception 'FAIL: Expected on_hand=0, available=0, got on_hand=%, available=%',
      v_ci.on_hand_qty, v_ci.available_qty;
  end if;
  raise notice 'PASS: TEST 9 — Current inventory reduced to on_hand=%, available=%',
    v_ci.on_hand_qty, v_ci.available_qty;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 10: Duplicate cancellation blocked
  -- ═══════════════════════════════════════════════════════════════════════════

  v_cancel_result := wh_cancel_grn(p_grn_id => v_grn_id, p_reason => 'Try again');

  if (v_cancel_result->>'ok')::boolean then
    raise exception 'FAIL: Duplicate cancellation should have been blocked';
  end if;
  raise notice 'PASS: TEST 10 — Duplicate cancellation blocked: %', v_cancel_result->>'error';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 11: Cancellation without reason blocked
  -- ═══════════════════════════════════════════════════════════════════════════

  v_cancel_result := wh_cancel_grn(p_grn_id => v_grn_id, p_reason => '');

  if (v_cancel_result->>'ok')::boolean then
    raise exception 'FAIL: Cancellation without reason should have been blocked';
  end if;
  raise notice 'PASS: TEST 11 — Empty reason blocked: %', v_cancel_result->>'error';

  v_cancel_result := wh_cancel_grn(p_grn_id => v_grn_id, p_reason => null);

  if (v_cancel_result->>'ok')::boolean then
    raise exception 'FAIL: Cancellation with null reason should have been blocked';
  end if;
  raise notice 'PASS: TEST 11 — Null reason blocked: %', v_cancel_result->>'error';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- TEST 12: Cancellation of draft blocked
  -- ═══════════════════════════════════════════════════════════════════════════

  declare
    v_draft_grn_id uuid;
  begin
    v_grn_result := wh_create_grn_draft(
      p_tenant_id => v_tenant_id,
      p_grn_number => 'GRN-CNCL-DRAFT-TEST',
      p_supplier_name => 'Draft Cancel Test',
      p_received_date => current_date,
      p_lines => jsonb_build_array(jsonb_build_object(
        'product_id', v_product_id,
        'uom_id', v_uom_id,
        'received_qty', 10,
        'accepted_qty', 10,
        'batch_number', 'BATCH-CNCL-DRAFT',
        'bin_id', v_bin_id
      ))
    );
    v_draft_grn_id := (v_grn_result->'data'->>'grn_id')::uuid;

    v_cancel_result := wh_cancel_grn(p_grn_id => v_draft_grn_id, p_reason => 'Should not work');

    if (v_cancel_result->>'ok')::boolean then
      raise exception 'FAIL: Cancellation of draft GRN should have been blocked';
    end if;
    raise notice 'PASS: TEST 12 — Draft cancellation blocked: %', v_cancel_result->>'error';
  end;

  raise notice '';
  raise notice '═══════════════════════════════════════════════════';
  raise notice 'ALL TESTS PASSED (12/12)';
  raise notice '═══════════════════════════════════════════════════';
end;
$$;

rollback;
