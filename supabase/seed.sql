insert into app.tenants (id, name, slug)
values
  ('11111111-1111-1111-1111-111111111111', 'Demo Tenant', 'demo-tenant')
on conflict do nothing;

insert into wh.product_categories (id, tenant_id, code, name)
values
  ('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'RAW', 'Raw Material'),
  ('21111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'FG', 'Finished Goods')
on conflict do nothing;

insert into wh.units_of_measure (id, tenant_id, code, name)
values
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'PCS', 'Pieces')
on conflict do nothing;

insert into wh.warehouses (id, tenant_id, warehouse_code, name)
values
  ('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'WH-01', 'Main Warehouse'),
  ('41111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'WH-02', 'Overflow Warehouse')
on conflict do nothing;

insert into wh.products (id, tenant_id, category_id, uom_id, sku, name, reorder_point)
values
  ('51111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'SKU-001', 'Demo Product A', 20),
  ('51111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111112', '31111111-1111-1111-1111-111111111111', 'SKU-002', 'Demo Product B', 50)
on conflict do nothing;

insert into wh.inventory_batches (id, tenant_id, product_id, batch_no, mfg_date, expiry_date)
values
  ('61111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'BATCH-A', current_date - interval '30 day', current_date + interval '7 day'),
  ('61111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', 'BATCH-B', current_date - interval '40 day', current_date + interval '180 day')
on conflict do nothing;

insert into wh.inventory_stock (id, tenant_id, product_id, batch_id, warehouse_id, quantity, reserved_quantity, average_cost)
values
  ('71111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', '61111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', 12, 3, 55),
  ('71111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', '61111111-1111-1111-1111-111111111112', '41111111-1111-1111-1111-111111111111', 220, 0, 20)
on conflict do nothing;

insert into wh.inventory_movements (id, movement_no, movement_type, tenant_id, product_id, batch_id, destination_warehouse_id, quantity, unit_cost, total_cost, movement_date)
values
  ('81111111-1111-1111-1111-111111111111', 'MV-SEED-1', 'GRN', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', '61111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', 15, 55, 825, now() - interval '2 day'),
  ('81111111-1111-1111-1111-111111111112', 'MV-SEED-2', 'GRN', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', '61111111-1111-1111-1111-111111111112', '41111111-1111-1111-1111-111111111111', 220, 20, 4400, now() - interval '10 day')
on conflict do nothing;

insert into wh.stock_transfers (id, tenant_id, transfer_no, source_warehouse_id, destination_warehouse_id, status)
values
  ('91111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'TR-SEED-1', '41111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111112', 'pending')
on conflict do nothing;

insert into wh.reorder_alerts (id, tenant_id, product_id, current_qty, reorder_point, severity, is_resolved)
values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 9, 20, 'critical', false)
on conflict do nothing;

insert into wh.inventory_valuation (id, tenant_id, product_id, valuation_date, quantity, average_cost, total_value)
values
  ('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', current_date, 12, 55, 660),
  ('b1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111112', current_date, 220, 20, 4400)
on conflict do nothing;
