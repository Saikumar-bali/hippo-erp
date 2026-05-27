-- full_inventory_flow.sql
-- Run in a safe test database/session only.

begin;

-- Isolated tenant + user context
insert into auth.users (id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values ('90000000-0000-0000-0000-000000000001','authenticated','authenticated','sim@example.com','{"full_name":"Simulation User"}'::jsonb,'{}'::jsonb,now(),now())
on conflict (id) do nothing;

insert into app.tenants (id, name, slug)
values ('90000000-0000-0000-0000-000000000010','Simulation Tenant','simulation-tenant')
on conflict (id) do nothing;

insert into app.tenant_members (tenant_id, user_id, role, is_active)
values ('90000000-0000-0000-0000-000000000010','90000000-0000-0000-0000-000000000001','admin',true)
on conflict (tenant_id, user_id) do update set role='admin', is_active=true;

select set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001', true);

-- Product/category/UOM creation
insert into wh.product_categories (id, tenant_id, code, name)
values ('90000000-0000-0000-0000-000000000020','90000000-0000-0000-0000-000000000010','SIM-CAT','Simulation Category');

insert into wh.units_of_measure (id, tenant_id, code, name)
values ('90000000-0000-0000-0000-000000000021','90000000-0000-0000-0000-000000000010','PCS','Pieces');

insert into wh.products (id, tenant_id, category_id, uom_id, sku, name, reorder_point)
values ('90000000-0000-0000-0000-000000000022','90000000-0000-0000-0000-000000000010','90000000-0000-0000-0000-000000000020','90000000-0000-0000-0000-000000000021','SIM-SKU-1','Simulation Product',10);

-- Warehouse/bin setup
insert into wh.warehouses (id, tenant_id, warehouse_code, name)
values ('90000000-0000-0000-0000-000000000030','90000000-0000-0000-0000-000000000010','SIM-WH-A','Sim Warehouse A'),
       ('90000000-0000-0000-0000-000000000031','90000000-0000-0000-0000-000000000010','SIM-WH-B','Sim Warehouse B');

-- GRN create + receive + batch creation
with g as (
  select wh.create_grn(jsonb_build_object(
    'tenant_id','90000000-0000-0000-0000-000000000010',
    'warehouse_id','90000000-0000-0000-0000-000000000030',
    'supplier_name','Simulation Supplier',
    'lines',jsonb_build_array(jsonb_build_object('product_id','90000000-0000-0000-0000-000000000022','qty',25,'unit_cost',12))
  )) payload
), line_id as (
  select gl.id from g join wh.grn_lines gl on gl.grn_id = (g.payload->>'grn_id')::uuid limit 1
)
select wh.receive_grn_line(id) from line_id;

-- Reservation + release/dispatch
with stock_row as (
  select id from wh.inventory_stock where tenant_id='90000000-0000-0000-0000-000000000010' limit 1
), res as (
  select wh.reserve_stock((select id from stock_row), 3, 'SIM-ORDER-1') payload
)
select payload from res;

update wh.inventory_reservations
set status='active'
where tenant_id='90000000-0000-0000-0000-000000000010';

select wh.release_reservation(id) from wh.inventory_reservations where tenant_id='90000000-0000-0000-0000-000000000010' limit 1;

-- Transfer
with t as (
  select wh.create_stock_transfer(jsonb_build_object(
    'tenant_id','90000000-0000-0000-0000-000000000010',
    'source_warehouse_id','90000000-0000-0000-0000-000000000030',
    'destination_warehouse_id','90000000-0000-0000-0000-000000000031',
    'lines',jsonb_build_array(jsonb_build_object(
      'product_id','90000000-0000-0000-0000-000000000022',
      'quantity',2
    ))
  )) payload
)
select wh.complete_stock_transfer((payload->>'transfer_id')::uuid) from t;

-- Adjustment
with a as (
  select wh.create_stock_adjustment(jsonb_build_object(
    'tenant_id','90000000-0000-0000-0000-000000000010',
    'warehouse_id','90000000-0000-0000-0000-000000000030',
    'reason','simulation adjustment'
  )) payload
)
select wh.approve_stock_adjustment((payload->>'adjustment_id')::uuid,'90000000-0000-0000-0000-000000000022',null,null,-1) from a;

-- Cycle count
with c as (
  select wh.start_cycle_count('90000000-0000-0000-0000-000000000010','90000000-0000-0000-0000-000000000030') payload
)
select wh.complete_cycle_count((payload->>'cycle_count_id')::uuid) from c;

-- Reorder + valuation
select wh.generate_reorder_alerts('90000000-0000-0000-0000-000000000010');
select wh.recalculate_inventory_valuation('90000000-0000-0000-0000-000000000010');

-- Negative: insufficient stock must fail
-- select wh.reserve_stock((select id from wh.inventory_stock where tenant_id='90000000-0000-0000-0000-000000000010' limit 1), 999999, 'SIM-NEG-INSUFF');

-- Negative: tenant isolation (practical check)
-- select count(*) from wh.products where tenant_id <> '90000000-0000-0000-0000-000000000010';

rollback;
