-- 0036_inventory_list_rpcs.sql
-- Phase 4.3: SECURITY DEFINER RPCs for listing current inventory + movements
--
-- RPCs:
--   wh_list_current_inventory    — List current on-hand/available qty with product/bin labels
--   wh_list_inventory_movements  — List movement ledger with product/batch/bin labels
--
-- Both are read-only. Writes go through wh_post_grn only.
-- All RPCs return JSONB: {ok: true, data: [...]} or {ok: false, error: '...'}

-- ── 1. wh_list_current_inventory ──────────────────────────────────────────────

create or replace function wh_list_current_inventory(
  p_tenant_id uuid,
  p_product_id uuid default null,
  p_bin_id uuid default null,
  p_limit int default 100,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has_permission boolean;
begin
  -- Permission check
  select wh.current_user_has_grn_permission(p_tenant_id, 'view_current_inventory')
  into v_has_permission;

  if not v_has_permission then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: view_current_inventory');
  end if;

  return jsonb_build_object(
    'ok', true,
    'data', (
      select jsonb_agg(
        jsonb_build_object(
          'id', ci.id,
          'product_id', ci.product_id,
          'product_sku', p.sku,
          'product_name', p.name,
          'batch_id', ci.batch_id,
          'batch_number', ib.batch_number,
          'bin_id', ci.bin_id,
          'bin_code', wb.bin_code,
          'bin_name', wb.name,
          'on_hand_qty', ci.on_hand_qty,
          'available_qty', ci.available_qty,
          'last_movement_at', ci.last_movement_at
        )
        order by p.sku, ib.batch_number, wb.bin_code
      )
      from wh.current_inventory ci
      left join wh.products p on p.id = ci.product_id
      left join wh.inventory_batches ib on ib.id = ci.batch_id
      left join wh.warehouse_bins wb on wb.id = ci.bin_id
      where ci.tenant_id = p_tenant_id
        and (p_product_id is null or ci.product_id = p_product_id)
        and (p_bin_id is null or ci.bin_id = p_bin_id)
      limit greatest(1, p_limit)
      offset greatest(0, p_offset)
    )
  );
end;
$$;

-- ── 2. wh_list_inventory_movements ────────────────────────────────────────────

create or replace function wh_list_inventory_movements(
  p_tenant_id uuid,
  p_product_id uuid default null,
  p_movement_type text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_limit int default 100,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has_permission boolean;
begin
  -- Permission check
  select wh.current_user_has_grn_permission(p_tenant_id, 'view_inventory_movements')
  into v_has_permission;

  if not v_has_permission then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: view_inventory_movements');
  end if;

  return jsonb_build_object(
    'ok', true,
    'data', (
      select jsonb_agg(
        jsonb_build_object(
          'id', im.id,
          'movement_type', im.movement_type,
          'source_type', im.source_type,
          'source_id', im.source_id,
          'source_line_id', im.source_line_id,
          'product_id', im.product_id,
          'product_sku', p.sku,
          'product_name', p.name,
          'batch_id', im.batch_id,
          'batch_number', ib.batch_number,
          'bin_id', im.bin_id,
          'bin_code', wb.bin_code,
          'bin_name', wb.name,
          'qty_delta', im.qty_delta,
          'movement_date', im.movement_date,
          'created_by', im.created_by
        )
        order by im.movement_date desc, im.created_at desc
      )
      from wh.inventory_movements im
      left join wh.products p on p.id = im.product_id
      left join wh.inventory_batches ib on ib.id = im.batch_id
      left join wh.warehouse_bins wb on wb.id = im.bin_id
      where im.tenant_id = p_tenant_id
        and (p_product_id is null or im.product_id = p_product_id)
        and (p_movement_type is null or im.movement_type = p_movement_type)
        and (p_date_from is null or im.movement_date >= p_date_from)
        and (p_date_to is null or im.movement_date <= p_date_to)
      limit greatest(1, p_limit)
      offset greatest(0, p_offset)
    )
  );
end;
$$;
