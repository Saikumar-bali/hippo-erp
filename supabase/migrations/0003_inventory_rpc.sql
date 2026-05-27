create or replace function wh.post_inventory_movement(
  p_tenant_id uuid,
  p_movement_type wh.movement_type,
  p_product_id uuid,
  p_batch_id uuid,
  p_source_warehouse_id uuid,
  p_source_bin_id uuid,
  p_destination_warehouse_id uuid,
  p_destination_bin_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_reference_table text,
  p_reference_id uuid
) returns wh.inventory_movements
language plpgsql
security invoker
as $$
declare
  v_row wh.inventory_movements;
begin
  if p_quantity < 0 then
    raise exception 'Movement quantity cannot be negative';
  end if;

  if not app.current_user_has_tenant_role(p_tenant_id, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized for tenant';
  end if;

  insert into wh.inventory_movements(
    movement_no,movement_type,tenant_id,product_id,batch_id,
    source_warehouse_id,source_bin_id,destination_warehouse_id,destination_bin_id,
    quantity,unit_cost,total_cost,reference_table,reference_id,created_by,movement_date
  ) values (
    concat('MV-', to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')),
    p_movement_type,p_tenant_id,p_product_id,p_batch_id,
    p_source_warehouse_id,p_source_bin_id,p_destination_warehouse_id,p_destination_bin_id,
    p_quantity,coalesce(p_unit_cost,0),p_quantity * coalesce(p_unit_cost,0),p_reference_table,p_reference_id,auth.uid(),now()
  ) returning * into v_row;

  return v_row;
end;
$$;

create or replace function wh._upsert_stock(
  p_tenant_id uuid,
  p_product_id uuid,
  p_batch_id uuid,
  p_warehouse_id uuid,
  p_bin_id uuid,
  p_delta_qty numeric,
  p_delta_reserved numeric,
  p_unit_cost numeric
) returns wh.inventory_stock
language plpgsql
security invoker
as $$
declare
  v_stock wh.inventory_stock;
  v_new_qty numeric;
  v_new_reserved numeric;
  v_new_avg numeric;
begin
  select * into v_stock
  from wh.inventory_stock
  where tenant_id = p_tenant_id
    and product_id = p_product_id
    and batch_id is not distinct from p_batch_id
    and warehouse_id = p_warehouse_id
    and bin_id is not distinct from p_bin_id
  for update;

  if not found then
    if p_delta_qty < 0 or p_delta_reserved < 0 then
      raise exception 'Cannot create stock row with negative values';
    end if;

    insert into wh.inventory_stock(
      tenant_id, product_id, batch_id, warehouse_id, bin_id,
      quantity, reserved_quantity, average_cost, last_updated
    ) values (
      p_tenant_id, p_product_id, p_batch_id, p_warehouse_id, p_bin_id,
      p_delta_qty, p_delta_reserved, greatest(coalesce(p_unit_cost,0),0), now()
    ) returning * into v_stock;

    return v_stock;
  end if;

  v_new_qty := v_stock.quantity + p_delta_qty;
  v_new_reserved := v_stock.reserved_quantity + p_delta_reserved;

  if v_new_qty < 0 then
    raise exception 'Insufficient physical stock';
  end if;
  if v_new_reserved < 0 then
    raise exception 'Reserved quantity cannot be negative';
  end if;
  if v_new_reserved > v_new_qty then
    raise exception 'Reserved quantity cannot exceed quantity';
  end if;

  if p_delta_qty > 0 and coalesce(p_unit_cost,0) > 0 then
    if v_stock.quantity <= 0 then
      v_new_avg := p_unit_cost;
    else
      v_new_avg := ((v_stock.quantity * v_stock.average_cost) + (p_delta_qty * p_unit_cost)) / v_new_qty;
    end if;
  else
    v_new_avg := v_stock.average_cost;
  end if;

  update wh.inventory_stock
  set quantity = v_new_qty,
      reserved_quantity = v_new_reserved,
      average_cost = greatest(coalesce(v_new_avg, 0), 0),
      last_updated = now()
  where id = v_stock.id
  returning * into v_stock;

  return v_stock;
end;
$$;

create or replace function wh.create_grn(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_grn wh.grn_headers;
  v_line jsonb;
begin
  if not app.current_user_has_tenant_role((p_payload->>'tenant_id')::uuid, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized for tenant';
  end if;

  insert into wh.grn_headers(tenant_id,grn_no,warehouse_id,supplier_name,status,pending_qc,created_by)
  values (
    (p_payload->>'tenant_id')::uuid,
    concat('GRN-',to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')),
    (p_payload->>'warehouse_id')::uuid,
    p_payload->>'supplier_name',
    'created',
    true,
    auth.uid()
  ) returning * into v_grn;

  for v_line in select * from jsonb_array_elements(coalesce(p_payload->'lines','[]'::jsonb))
  loop
    insert into wh.grn_lines(tenant_id,grn_id,product_id,received_qty,unit_cost)
    values (
      v_grn.tenant_id,
      v_grn.id,
      (v_line->>'product_id')::uuid,
      greatest((v_line->>'qty')::numeric,0),
      greatest((v_line->>'unit_cost')::numeric,0)
    );
  end loop;

  return jsonb_build_object('grn_id', v_grn.id, 'grn_no', v_grn.grn_no);
end;
$$;

create or replace function wh.receive_grn_line(p_grn_line_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_line wh.grn_lines;
  v_header wh.grn_headers;
  v_batch wh.inventory_batches;
  v_stock wh.inventory_stock;
begin
  select * into v_line from wh.grn_lines where id = p_grn_line_id for update;
  if not found then raise exception 'GRN line not found'; end if;

  select * into v_header from wh.grn_headers where id = v_line.grn_id for update;
  if not app.current_user_has_tenant_role(v_line.tenant_id, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized';
  end if;

  if v_line.batch_id is null then
    insert into wh.inventory_batches(tenant_id, product_id, batch_no)
    values (v_line.tenant_id, v_line.product_id, concat('B-', to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')))
    returning * into v_batch;
    update wh.grn_lines set batch_id = v_batch.id, updated_at = now() where id = v_line.id;
    v_line.batch_id := v_batch.id;
  end if;

  v_stock := wh._upsert_stock(v_line.tenant_id, v_line.product_id, v_line.batch_id, v_header.warehouse_id, null, v_line.received_qty, 0, v_line.unit_cost);

  perform wh.post_inventory_movement(
    v_line.tenant_id,'GRN',v_line.product_id,v_line.batch_id,
    null,null,v_header.warehouse_id,null,
    v_line.received_qty,v_line.unit_cost,'grn_lines',v_line.id
  );

  update wh.grn_headers set status = 'received', updated_at = now() where id = v_header.id;

  return jsonb_build_object('stock_id', v_stock.id, 'batch_id', v_line.batch_id, 'received_qty', v_line.received_qty);
end;
$$;

create or replace function wh.allocate_grn_to_bin(p_grn_line_id uuid, p_bin_id uuid, p_qty numeric)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_line wh.grn_lines;
  v_header wh.grn_headers;
  v_bin wh.warehouse_bins;
begin
  if p_qty <= 0 then raise exception 'Quantity must be > 0'; end if;

  select * into v_line from wh.grn_lines where id = p_grn_line_id for update;
  select * into v_header from wh.grn_headers where id = v_line.grn_id;
  select * into v_bin from wh.warehouse_bins where id = p_bin_id;

  if not app.current_user_has_tenant_role(v_line.tenant_id, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized';
  end if;

  perform wh._upsert_stock(v_line.tenant_id, v_line.product_id, v_line.batch_id, v_header.warehouse_id, null, -p_qty, 0, null);
  perform wh._upsert_stock(v_line.tenant_id, v_line.product_id, v_line.batch_id, v_header.warehouse_id, p_bin_id, p_qty, 0, v_line.unit_cost);

  perform wh.post_inventory_movement(
    v_line.tenant_id,'STOCK_TRANSFER',v_line.product_id,v_line.batch_id,
    v_header.warehouse_id,null,v_header.warehouse_id,p_bin_id,
    p_qty,v_line.unit_cost,'grn_lines',v_line.id
  );

  return jsonb_build_object('allocated_qty', p_qty, 'bin_id', p_bin_id);
end;
$$;

create or replace function wh.reserve_stock(p_stock_id uuid, p_qty numeric, p_reference_no text)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_stock wh.inventory_stock;
  v_available numeric;
begin
  if p_qty <= 0 then raise exception 'Reservation quantity must be > 0'; end if;

  select * into v_stock from wh.inventory_stock where id = p_stock_id for update;
  if not found then raise exception 'Stock row not found'; end if;

  if not app.current_user_has_tenant_role(v_stock.tenant_id, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized';
  end if;

  v_available := v_stock.quantity - v_stock.reserved_quantity;
  if p_qty > v_available then raise exception 'Insufficient available stock'; end if;

  perform wh._upsert_stock(v_stock.tenant_id, v_stock.product_id, v_stock.batch_id, v_stock.warehouse_id, v_stock.bin_id, 0, p_qty, null);

  insert into wh.inventory_reservations(tenant_id, stock_id, reference_no, quantity, created_by)
  values (v_stock.tenant_id, p_stock_id, p_reference_no, p_qty, auth.uid());

  return jsonb_build_object('reserved', p_qty, 'available_after', v_available - p_qty);
end;
$$;

create or replace function wh.release_reservation(p_reservation_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_res wh.inventory_reservations;
  v_stock wh.inventory_stock;
begin
  select * into v_res from wh.inventory_reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;

  select * into v_stock from wh.inventory_stock where id = v_res.stock_id for update;

  if not app.current_user_has_tenant_role(v_res.tenant_id, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized';
  end if;

  if v_res.status <> 'active' then
    raise exception 'Reservation is not active';
  end if;

  perform wh._upsert_stock(v_stock.tenant_id, v_stock.product_id, v_stock.batch_id, v_stock.warehouse_id, v_stock.bin_id, 0, -v_res.quantity, null);

  update wh.inventory_reservations
  set status = 'released', updated_at = now()
  where id = p_reservation_id;

  return jsonb_build_object('released', v_res.quantity);
end;
$$;

create or replace function wh.dispatch_reserved_stock(p_reservation_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_res wh.inventory_reservations;
  v_stock wh.inventory_stock;
begin
  select * into v_res from wh.inventory_reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_res.status <> 'active' then raise exception 'Reservation not active'; end if;

  select * into v_stock from wh.inventory_stock where id = v_res.stock_id for update;

  if not app.current_user_has_tenant_role(v_res.tenant_id, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized';
  end if;

  perform wh._upsert_stock(v_stock.tenant_id, v_stock.product_id, v_stock.batch_id, v_stock.warehouse_id, v_stock.bin_id, -v_res.quantity, -v_res.quantity, null);

  perform wh.post_inventory_movement(
    v_res.tenant_id, 'SALES_DISPATCH', v_stock.product_id, v_stock.batch_id,
    v_stock.warehouse_id, v_stock.bin_id, null, null,
    v_res.quantity, v_stock.average_cost, 'inventory_reservations', v_res.id
  );

  update wh.inventory_reservations set status = 'dispatched', updated_at = now() where id = v_res.id;

  return jsonb_build_object('dispatched', v_res.quantity);
end;
$$;

create or replace function wh.create_stock_transfer(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_transfer wh.stock_transfers;
  v_line jsonb;
begin
  if not app.current_user_has_tenant_role((p_payload->>'tenant_id')::uuid, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized';
  end if;

  insert into wh.stock_transfers(
    tenant_id, transfer_no, source_warehouse_id, destination_warehouse_id, status, created_by
  ) values (
    (p_payload->>'tenant_id')::uuid,
    concat('TR-', to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')),
    (p_payload->>'source_warehouse_id')::uuid,
    (p_payload->>'destination_warehouse_id')::uuid,
    'pending',
    auth.uid()
  ) returning * into v_transfer;

  for v_line in select * from jsonb_array_elements(coalesce(p_payload->'lines','[]'::jsonb))
  loop
    insert into wh.stock_transfer_lines(
      tenant_id, transfer_id, product_id, batch_id, quantity, source_bin_id, destination_bin_id
    ) values (
      v_transfer.tenant_id, v_transfer.id, (v_line->>'product_id')::uuid,
      nullif(v_line->>'batch_id','')::uuid, (v_line->>'quantity')::numeric,
      nullif(v_line->>'source_bin_id','')::uuid, nullif(v_line->>'destination_bin_id','')::uuid
    );
  end loop;

  return jsonb_build_object('transfer_id', v_transfer.id, 'transfer_no', v_transfer.transfer_no);
end;
$$;

create or replace function wh.complete_stock_transfer(p_transfer_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_transfer wh.stock_transfers;
  v_line wh.stock_transfer_lines;
  v_source_stock wh.inventory_stock;
begin
  select * into v_transfer from wh.stock_transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transfer not found'; end if;

  if not app.current_user_has_tenant_role(v_transfer.tenant_id, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized';
  end if;

  for v_line in select * from wh.stock_transfer_lines where transfer_id = v_transfer.id
  loop
    select * into v_source_stock
    from wh.inventory_stock
    where tenant_id = v_transfer.tenant_id
      and product_id = v_line.product_id
      and batch_id is not distinct from v_line.batch_id
      and warehouse_id = v_transfer.source_warehouse_id
      and bin_id is not distinct from v_line.source_bin_id
    for update;

    if not found then
      raise exception 'Source stock row not found for transfer line %', v_line.id;
    end if;

    perform wh._upsert_stock(v_transfer.tenant_id, v_line.product_id, v_line.batch_id, v_transfer.source_warehouse_id, v_line.source_bin_id, -v_line.quantity, 0, null);
    perform wh._upsert_stock(v_transfer.tenant_id, v_line.product_id, v_line.batch_id, v_transfer.destination_warehouse_id, v_line.destination_bin_id, v_line.quantity, 0, v_source_stock.average_cost);

    perform wh.post_inventory_movement(
      v_transfer.tenant_id,'STOCK_TRANSFER',v_line.product_id,v_line.batch_id,
      v_transfer.source_warehouse_id,v_line.source_bin_id,v_transfer.destination_warehouse_id,v_line.destination_bin_id,
      v_line.quantity,v_source_stock.average_cost,'stock_transfers',v_transfer.id
    );
  end loop;

  update wh.stock_transfers set status = 'completed', updated_at = now() where id = v_transfer.id;
  return jsonb_build_object('transfer_id', v_transfer.id, 'status', 'completed');
end;
$$;

create or replace function wh.create_stock_adjustment(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_adj wh.stock_adjustments;
begin
  if not app.current_user_has_tenant_role((p_payload->>'tenant_id')::uuid, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized';
  end if;

  insert into wh.stock_adjustments(tenant_id, adjustment_no, warehouse_id, reason, status, created_by)
  values (
    (p_payload->>'tenant_id')::uuid,
    concat('ADJ-', to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')),
    (p_payload->>'warehouse_id')::uuid,
    p_payload->>'reason',
    'pending',
    auth.uid()
  ) returning * into v_adj;

  return jsonb_build_object('adjustment_id', v_adj.id, 'adjustment_no', v_adj.adjustment_no);
end;
$$;

create or replace function wh.approve_stock_adjustment(
  p_adjustment_id uuid,
  p_product_id uuid,
  p_batch_id uuid,
  p_bin_id uuid,
  p_delta_qty numeric
) returns jsonb
language plpgsql
security invoker
as $$
declare
  v_adj wh.stock_adjustments;
  v_stock wh.inventory_stock;
  v_cost numeric;
begin
  select * into v_adj from wh.stock_adjustments where id = p_adjustment_id for update;
  if not found then raise exception 'Adjustment not found'; end if;

  if not app.current_user_has_tenant_role(v_adj.tenant_id, array['owner','admin','warehouse_manager']) then
    raise exception 'Not authorized';
  end if;

  select * into v_stock
  from wh.inventory_stock
  where tenant_id = v_adj.tenant_id and product_id = p_product_id and batch_id is not distinct from p_batch_id
    and warehouse_id = v_adj.warehouse_id and bin_id is not distinct from p_bin_id
  for update;

  v_cost := coalesce(v_stock.average_cost, 0);

  perform wh._upsert_stock(v_adj.tenant_id, p_product_id, p_batch_id, v_adj.warehouse_id, p_bin_id, p_delta_qty, 0, v_cost);

  perform wh.post_inventory_movement(
    v_adj.tenant_id, 'STOCK_ADJUSTMENT', p_product_id, p_batch_id,
    v_adj.warehouse_id, p_bin_id, v_adj.warehouse_id, p_bin_id,
    abs(p_delta_qty), v_cost, 'stock_adjustments', v_adj.id
  );

  update wh.stock_adjustments set status = 'approved', approved_by = auth.uid(), updated_at = now() where id = v_adj.id;
  return jsonb_build_object('adjustment_id', v_adj.id, 'status', 'approved');
end;
$$;

create or replace function wh.start_cycle_count(p_tenant_id uuid, p_warehouse_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_cc wh.cycle_counts;
begin
  if not app.current_user_has_tenant_role(p_tenant_id, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized';
  end if;

  insert into wh.cycle_counts(tenant_id, count_no, warehouse_id, status, created_by)
  values (p_tenant_id, concat('CC-', to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS')), p_warehouse_id, 'open', auth.uid())
  returning * into v_cc;

  insert into wh.cycle_count_lines(tenant_id, cycle_count_id, product_id, batch_id, expected_qty, counted_qty)
  select tenant_id, v_cc.id, product_id, batch_id, quantity, quantity
  from wh.inventory_stock
  where tenant_id = p_tenant_id and warehouse_id = p_warehouse_id;

  return jsonb_build_object('cycle_count_id', v_cc.id, 'count_no', v_cc.count_no);
end;
$$;

create or replace function wh.complete_cycle_count(p_cycle_count_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_cc wh.cycle_counts;
  v_line wh.cycle_count_lines;
  v_delta numeric;
begin
  select * into v_cc from wh.cycle_counts where id = p_cycle_count_id for update;
  if not found then raise exception 'Cycle count not found'; end if;

  if not app.current_user_has_tenant_role(v_cc.tenant_id, array['owner','admin','warehouse_manager']) then
    raise exception 'Not authorized';
  end if;

  for v_line in select * from wh.cycle_count_lines where cycle_count_id = v_cc.id
  loop
    v_delta := v_line.counted_qty - v_line.expected_qty;
    if v_delta <> 0 then
      perform wh._upsert_stock(v_line.tenant_id, v_line.product_id, v_line.batch_id, v_cc.warehouse_id, null, v_delta, 0, null);
      perform wh.post_inventory_movement(
        v_line.tenant_id, 'CYCLE_COUNT', v_line.product_id, v_line.batch_id,
        v_cc.warehouse_id, null, v_cc.warehouse_id, null,
        abs(v_delta), 0, 'cycle_counts', v_cc.id
      );
    end if;
  end loop;

  update wh.cycle_counts set status = 'completed', updated_at = now() where id = v_cc.id;
  return jsonb_build_object('cycle_count_id', v_cc.id, 'status', 'completed');
end;
$$;

create or replace function wh.generate_reorder_alerts(p_tenant_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_count integer;
begin
  if not app.current_user_has_tenant_role(p_tenant_id, array['owner','admin','warehouse_manager','stock_operator']) then
    raise exception 'Not authorized';
  end if;

  delete from wh.reorder_alerts where tenant_id = p_tenant_id and is_resolved = false;

  insert into wh.reorder_alerts(tenant_id, product_id, current_qty, reorder_point, severity)
  select p.tenant_id, p.id, coalesce(sum(s.quantity - s.reserved_quantity),0), p.reorder_point,
         case when coalesce(sum(s.quantity - s.reserved_quantity),0) <= p.reorder_point * 0.5 then 'critical' else 'low' end
  from wh.products p
  left join wh.inventory_stock s on s.tenant_id = p.tenant_id and s.product_id = p.id
  where p.tenant_id = p_tenant_id
  group by p.tenant_id, p.id, p.reorder_point
  having coalesce(sum(s.quantity - s.reserved_quantity),0) <= p.reorder_point;

  get diagnostics v_count = row_count;
  return jsonb_build_object('alerts_created', v_count);
end;
$$;

create or replace function wh.recalculate_inventory_valuation(p_tenant_id uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_count integer;
begin
  if not app.current_user_has_tenant_role(p_tenant_id, array['owner','admin','warehouse_manager','auditor']) then
    raise exception 'Not authorized';
  end if;

  delete from wh.inventory_valuation where tenant_id = p_tenant_id and valuation_date = current_date;

  insert into wh.inventory_valuation(tenant_id, product_id, valuation_date, quantity, average_cost, total_value)
  select tenant_id, product_id, current_date, sum(quantity),
         case when sum(quantity) > 0 then sum(quantity * average_cost) / sum(quantity) else 0 end as avg_cost,
         sum(quantity * average_cost)
  from wh.inventory_stock
  where tenant_id = p_tenant_id
  group by tenant_id, product_id;

  get diagnostics v_count = row_count;
  return jsonb_build_object('valuation_rows', v_count);
end;
$$;
