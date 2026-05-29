-- product_master_flow.sql
-- Phase 2 Product Master Data end-to-end simulation.
-- Run in Supabase SQL Editor (safe test environment). Everything is rolled back.
-- This tests the public-schema RPC functions that bypass the wh schema exposure issue.

begin;

-- ── 1. Setup: test user + company + permissions ─────────────────────────────────

-- Create a test auth user
insert into auth.users (id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values ('a0000000-0000-0000-0000-000000000001','authenticated','authenticated','prod-test@example.com','{"full_name":"Product Test User"}'::jsonb,'{}'::jsonb,now(),now())
on conflict (id) do nothing;

-- Create simulation company
insert into app.tenants (id, name, slug)
values ('a0000000-0000-0000-0000-000000000010','Medicle Products','medicle-products')
on conflict (id) do nothing;

-- Create a custom role with all product permissions
insert into app.company_roles (id, tenant_id, name, code, description, is_active)
values ('a0000000-0000-0000-0000-000000000020','a0000000-0000-0000-0000-000000000010','Product Manager','product_manager','Can manage all product master data',true)
on conflict (id) do nothing;

-- Grant all four product permissions
insert into app.company_role_permissions (role_id, permission_key, is_granted)
values
  ('a0000000-0000-0000-0000-000000000020','view_products',true),
  ('a0000000-0000-0000-0000-000000000020','create_product',true),
  ('a0000000-0000-0000-0000-000000000020','update_product',true),
  ('a0000000-0000-0000-0000-000000000020','delete_product',true)
on conflict (role_id, permission_key) do nothing;

-- Assign user to role
insert into app.company_role_assignments (user_id, role_id, is_active)
values ('a0000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000020',true)
on conflict (user_id, role_id) do nothing;

-- Set auth context so auth.uid() works inside the RPCs
select set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000001', true);
select set_config('role', 'authenticated', true);

-- ── 2. Verify helper permission check ────────────────────────────────────────────

do $$
begin
  if not wh.current_user_has_product_permission('a0000000-0000-0000-0000-000000000010', 'view_products') then
    raise exception 'FAIL: view_products permission not detected';
  end if;
  raise notice 'PASS: view_products permission detected';
end;
$$;

do $$
begin
  if not wh.current_user_has_product_permission('a0000000-0000-0000-0000-000000000010', 'create_product') then
    raise exception 'FAIL: create_product permission not detected';
  end if;
  raise notice 'PASS: create_product permission detected';
end;
$$;

do $$
begin
  if not wh.current_user_has_product_permission('a0000000-0000-0000-0000-000000000010', 'delete_product') then
    raise exception 'FAIL: delete_product permission not detected';
  end if;
  raise notice 'PASS: delete_product permission detected';
end;
$$;

-- ── 3. Test public RPC: create product category ─────────────────────────────────

do $$
declare
  v_result jsonb;
begin
  v_result := public.create_product_category(
    'a0000000-0000-0000-0000-000000000010', -- p_tenant_id
    'MED-CAT',                               -- p_code
    'Medical Category',                      -- p_name
    'Test category for medicle products'     -- p_description
  );
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: create_product_category returned %', v_result->>'error';
  end if;
  raise notice 'PASS: create_product_category returned id=%', v_result->'data'->>'id';
end;
$$;

-- Create a second category (needed for product tests)
do $$
declare
  v_result jsonb;
begin
  v_result := public.create_product_category(
    'a0000000-0000-0000-0000-000000000010',
    'DRUG-CAT',
    'Drug Category',
    'Pharmaceutical products'
  );
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: create second category failed: %', v_result->>'error';
  end if;
  raise notice 'PASS: second category created';
end;
$$;

-- ── 4. Test public RPC: duplicate category code rejection ───────────────────────

do $$
declare
  v_result jsonb;
begin
  v_result := public.create_product_category(
    'a0000000-0000-0000-0000-000000000010',
    'MED-CAT',
    'Duplicate Category',
    'Should be rejected'
  );
  if (v_result->>'ok')::boolean then
    raise exception 'FAIL: duplicate category code was NOT rejected';
  end if;
  raise notice 'PASS: duplicate category code correctly rejected: %', v_result->>'error';
end;
$$;

-- ── 5. Test public RPC: create UOM ──────────────────────────────────────────────

do $$
declare
  v_result jsonb;
begin
  v_result := public.create_unit_of_measure(
    'a0000000-0000-0000-0000-000000000010',
    'TAB',
    'Tablets',
    'Solid dosage form'
  );
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: create_unit_of_measure returned %', v_result->>'error';
  end if;
  raise notice 'PASS: create_unit_of_measure returned id=%', v_result->'data'->>'id';
end;
$$;

do $$
declare
  v_result jsonb;
begin
  v_result := public.create_unit_of_measure(
    'a0000000-0000-0000-0000-000000000010',
    'BOT',
    'Bottle',
    'Bottle packaging'
  );
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: create second UOM failed: %', v_result->>'error';
  end if;
  raise notice 'PASS: second UOM created';
end;
$$;

-- ── 6. Test public RPC: create product ──────────────────────────────────────────

do $$
declare
  v_cat_id uuid;
  v_uom_id uuid;
  v_result jsonb;
begin
  -- Get the category and UOM IDs we just created
  select id into v_cat_id from wh.product_categories where code = 'MED-CAT';
  select id into v_uom_id from wh.units_of_measure where code = 'TAB';

  v_result := public.create_product(
    'a0000000-0000-0000-0000-000000000010',  -- p_tenant_id
    v_cat_id,                                 -- p_category_id
    v_uom_id,                                 -- p_uom_id
    'PARA-500',                               -- p_sku
    'Paracetamol 500mg',                      -- p_name
    'Pain reliever and fever reducer',        -- p_description
    '8901234567890',                          -- p_barcode
    'QR-PARA-500',                            -- p_qr_value
    100,                                      -- p_reorder_point
    500,                                      -- p_reorder_quantity
    true,                                     -- p_batch_tracking
    true                                      -- p_expiry_tracking
  );
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: create_product returned %', v_result->>'error';
  end if;
  raise notice 'PASS: create_product returned id=%', v_result->'data'->>'id';
end;
$$;

-- ── 7. Test public RPC: duplicate SKU rejection ─────────────────────────────────

do $$
declare
  v_cat_id uuid;
  v_uom_id uuid;
  v_result jsonb;
begin
  select id into v_cat_id from wh.product_categories where code = 'DRUG-CAT';
  select id into v_uom_id from wh.units_of_measure where code = 'BOT';

  v_result := public.create_product(
    'a0000000-0000-0000-0000-000000000010',
    v_cat_id,
    v_uom_id,
    'PARA-500',  -- same SKU
    'Duplicate SKU product'
  );
  if (v_result->>'ok')::boolean then
    raise exception 'FAIL: duplicate SKU was NOT rejected';
  end if;
  raise notice 'PASS: duplicate SKU correctly rejected: %', v_result->>'error';
end;
$$;

-- ── 8. Test public RPC: read categories ─────────────────────────────────────────

do $$
declare
  v_result jsonb;
  v_count int;
begin
  v_result := public.get_product_categories('a0000000-0000-0000-0000-000000000010');
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: get_product_categories returned %', v_result->>'error';
  end if;
  v_count := jsonb_array_length(v_result->'data');
  if v_count < 2 then
    raise exception 'FAIL: expected >=2 categories, got %', v_count;
  end if;
  raise notice 'PASS: get_product_categories returned % categories', v_count;
end;
$$;

-- ── 9. Test public RPC: read UOMs ──────────────────────────────────────────────

do $$
declare
  v_result jsonb;
  v_count int;
begin
  v_result := public.get_units_of_measure('a0000000-0000-0000-0000-000000000010');
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: get_units_of_measure returned %', v_result->>'error';
  end if;
  v_count := jsonb_array_length(v_result->'data');
  if v_count < 2 then
    raise exception 'FAIL: expected >=2 UOMs, got %', v_count;
  end if;
  raise notice 'PASS: get_units_of_measure returned % UOMs', v_count;
end;
$$;

-- ── 10. Test public RPC: read products ─────────────────────────────────────────

do $$
declare
  v_result jsonb;
  v_count int;
begin
  v_result := public.get_products('a0000000-0000-0000-0000-000000000010');
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: get_products returned %', v_result->>'error';
  end if;
  v_count := jsonb_array_length(v_result->'data');
  if v_count < 1 then
    raise exception 'FAIL: expected >=1 product, got %', v_count;
  end if;
  raise notice 'PASS: get_products returned % products', v_count;
end;
$$;

-- ── 11. Test public RPC: search products ────────────────────────────────────────

do $$
declare
  v_result jsonb;
  v_count int;
begin
  v_result := public.search_products('a0000000-0000-0000-0000-000000000010', 'Paracetamol');
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: search_products returned %', v_result->>'error';
  end if;
  v_count := jsonb_array_length(v_result->'data');
  if v_count < 1 then
    raise exception 'FAIL: expected >=1 search result for Paracetamol, got %', v_count;
  end if;
  raise notice 'PASS: search_products found % results', v_count;
end;
$$;

-- ── 12. Test public RPC: update product ─────────────────────────────────────────

do $$
declare
  v_prod_id uuid;
  v_result jsonb;
begin
  select id into v_prod_id from wh.products where sku = 'PARA-500';

  v_result := public.update_product(
    v_prod_id,
    p_name => 'Paracetamol 500mg (Updated)',
    p_reorder_point => 200
  );
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: update_product returned %', v_result->>'error';
  end if;
  raise notice 'PASS: update_product succeeded, new name=%', v_result->'data'->>'name';
end;
$$;

-- ── 13. Test public RPC: deactivate product ────────────────────────────────────

do $$
declare
  v_prod_id uuid;
  v_result jsonb;
begin
  select id into v_prod_id from wh.products where sku = 'PARA-500';

  v_result := public.deactivate_product(v_prod_id);
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: deactivate_product returned %', v_result->>'error';
  end if;
  raise notice 'PASS: deactivate_product succeeded';
end;
$$;

-- ── 14. Test public RPC: reactivate product ────────────────────────────────────

do $$
declare
  v_prod_id uuid;
  v_result jsonb;
begin
  select id into v_prod_id from wh.products where sku = 'PARA-500';

  v_result := public.reactivate_product(v_prod_id);
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: reactivate_product returned %', v_result->>'error';
  end if;
  raise notice 'PASS: reactivate_product succeeded';
end;
$$;

-- ── 15. Test public RPC: update category ────────────────────────────────────────

do $$
declare
  v_cat_id uuid;
  v_result jsonb;
begin
  select id into v_cat_id from wh.product_categories where code = 'MED-CAT';

  v_result := public.update_product_category(
    v_cat_id,
    p_name => 'Medical Category (Updated)'
  );
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: update_product_category returned %', v_result->>'error';
  end if;
  raise notice 'PASS: update_product_category succeeded';
end;
$$;

-- ── 16. Test public RPC: update UOM ───────────────────────────────────────────

do $$
declare
  v_uom_id uuid;
  v_result jsonb;
begin
  select id into v_uom_id from wh.units_of_measure where code = 'TAB';

  v_result := public.update_unit_of_measure(
    v_uom_id,
    p_name => 'Tablets (Updated)'
  );
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: update_unit_of_measure returned %', v_result->>'error';
  end if;
  raise notice 'PASS: update_unit_of_measure succeeded';
end;
$$;

-- ── 17. Test public RPC: deactivate category ───────────────────────────────────

do $$
declare
  v_cat_id uuid;
  v_result jsonb;
begin
  select id into v_cat_id from wh.product_categories where code = 'DRUG-CAT';
  v_result := public.deactivate_product_category(v_cat_id);
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: deactivate_product_category returned %', v_result->>'error';
  end if;
  raise notice 'PASS: deactivate_product_category succeeded';
end;
$$;

-- ── 18. Test public RPC: deactivate UOM ────────────────────────────────────────

do $$
declare
  v_uom_id uuid;
  v_result jsonb;
begin
  select id into v_uom_id from wh.units_of_measure where code = 'BOT';
  v_result := public.deactivate_unit_of_measure(v_uom_id);
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: deactivate_unit_of_measure returned %', v_result->>'error';
  end if;
  raise notice 'PASS: deactivate_unit_of_measure succeeded';
end;
$$;

-- ── 19. Test: expiry tracking requires batch tracking ─────────────────────────

do $$
declare
  v_cat_id uuid;
  v_uom_id uuid;
  v_result jsonb;
begin
  select id into v_cat_id from wh.product_categories where code = 'MED-CAT';
  select id into v_uom_id from wh.units_of_measure where code = 'TAB';

  v_result := public.create_product(
    'a0000000-0000-0000-0000-000000000010',
    v_cat_id,
    v_uom_id,
    'TEST-EXPIRY',
    'Expiry without batch',
    p_expiry_tracking => true,
    p_batch_tracking => false
  );
  if (v_result->>'ok')::boolean then
    raise exception 'FAIL: expiry without batch was NOT rejected';
  end if;
  raise notice 'PASS: expiry-without-batch correctly rejected: %', v_result->>'error';
end;
$$;

-- ── 20. Test: different company isolation ───────────────────────────────────────
-- Create a second company and verify same SKU can exist there

do $$
declare
  v_cat_id uuid;
  v_uom_id uuid;
  v_result jsonb;
  v_company2_id uuid := 'a0000000-0000-0000-0000-000000000011';
begin
  -- Create second company
  insert into app.tenants (id, name, slug)
  values (v_company2_id, 'Second Company', 'second-company')
  on conflict (id) do nothing;

  -- Create category and UOM in second company
  insert into wh.product_categories (id, tenant_id, code, name)
  values ('a0000000-0000-0000-0000-000000000030', v_company2_id, 'GEN-CAT', 'General Category')
  on conflict (id) do nothing;

  insert into wh.units_of_measure (id, tenant_id, code, name)
  values ('a0000000-0000-0000-0000-000000000031', v_company2_id, 'UNIT', 'Unit')
  on conflict (id) do nothing;

  -- Try creating same SKU in second company (should succeed)
  v_result := public.create_product(
    v_company2_id,
    'a0000000-0000-0000-0000-000000000030',
    'a0000000-0000-0000-0000-000000000031',
    'PARA-500',  -- same SKU as medicle products
    'Paracetamol from Second Company',
    p_description => 'Should be allowed in different company'
  );
  if not (v_result->>'ok')::boolean then
    raise exception 'FAIL: same SKU in different company was rejected: %', v_result->>'error';
  end if;
  raise notice 'PASS: same SKU allowed in different company (company isolation works)';
end;
$$;

-- ── Summary ─────────────────────────────────────────────────────────────────────

do $$
begin
  raise notice '═══════════════════════════════════════════════';
  raise notice '  ALL PRODUCT MASTER SIMULATION TESTS PASSED  ';
  raise notice '═══════════════════════════════════════════════';
end;
$$;

rollback;
