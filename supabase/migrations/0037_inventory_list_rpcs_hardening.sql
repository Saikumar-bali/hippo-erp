-- 0037_inventory_list_rpcs_hardening.sql
-- Phase 4.4: Harden inventory list RPCs for production
--
-- Changes from 0036:
--   1. Wrap jsonb_agg with COALESCE(..., '[]'::jsonb) so empty results return [] not null
--   2. Move filtering/ordering/limit/offset into a CTE applied BEFORE aggregation
--   3. Keeps permission checks, search_path, response shape {ok: true, data: [...]}

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
  select wh.current_user_has_grn_permission(p_tenant_id, 'view_current_inventory')
  into v_has_permission;

  if not v_has_permission then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: view_current_inventory');
  end if;

  return jsonb_build_object(
    'ok', true,
    'data', (
      with rows as (
        select ci.id, ci.product_id, ci.batch_id, ci.bin_id,
               ci.on_hand_qty, ci.available_qty, ci.last_movement_at,
               p.sku as product_sku, p.name as product_name,
               ib.batch_number,
               wb.bin_code, wb.name as bin_name
        from wh.current_inventory ci
        left join wh.products p on p.id = ci.product_id
        left join wh.inventory_batches ib on ib.id = ci.batch_id
        left join wh.warehouse_bins wb on wb.id = ci.bin_id
        where ci.tenant_id = p_tenant_id
          and (p_product_id is null or ci.product_id = p_product_id)
          and (p_bin_id is null or ci.bin_id = p_bin_id)
        order by p.sku, ib.batch_number, wb.bin_code
        limit greatest(1, p_limit)
        offset greatest(0, p_offset)
      )
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'product_id', r.product_id,
            'product_sku', r.product_sku,
            'product_name', r.product_name,
            'batch_id', r.batch_id,
            'batch_number', r.batch_number,
            'bin_id', r.bin_id,
            'bin_code', r.bin_code,
            'bin_name', r.bin_name,
            'on_hand_qty', r.on_hand_qty,
            'available_qty', r.available_qty,
            'last_movement_at', r.last_movement_at
          )
        ),
        '[]'::jsonb
      )
      from rows r
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
  select wh.current_user_has_grn_permission(p_tenant_id, 'view_inventory_movements')
  into v_has_permission;

  if not v_has_permission then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: view_inventory_movements');
  end if;

  return jsonb_build_object(
    'ok', true,
    'data', (
      with rows as (
        select im.id, im.movement_type, im.source_type, im.source_id,
               im.source_line_id, im.product_id, im.batch_id, im.bin_id,
               im.qty_delta, im.movement_date, im.created_by,
               p.sku as product_sku, p.name as product_name,
               ib.batch_number,
               wb.bin_code, wb.name as bin_name
        from wh.inventory_movements im
        left join wh.products p on p.id = im.product_id
        left join wh.inventory_batches ib on ib.id = im.batch_id
        left join wh.warehouse_bins wb on wb.id = im.bin_id
        where im.tenant_id = p_tenant_id
          and (p_product_id is null or im.product_id = p_product_id)
          and (p_movement_type is null or im.movement_type = p_movement_type)
          and (p_date_from is null or im.movement_date >= p_date_from)
          and (p_date_to is null or im.movement_date <= p_date_to)
        order by im.movement_date desc, im.created_at desc
        limit greatest(1, p_limit)
        offset greatest(0, p_offset)
      )
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'movement_type', r.movement_type,
            'source_type', r.source_type,
            'source_id', r.source_id,
            'source_line_id', r.source_line_id,
            'product_id', r.product_id,
            'product_sku', r.product_sku,
            'product_name', r.product_name,
            'batch_id', r.batch_id,
            'batch_number', r.batch_number,
            'bin_id', r.bin_id,
            'bin_code', r.bin_code,
            'bin_name', r.bin_name,
            'qty_delta', r.qty_delta,
            'movement_date', r.movement_date,
            'created_by', r.created_by
          )
        ),
        '[]'::jsonb
      )
      from rows r
    )
  );
end;
$$;

-- ── 3. Activate Current Inventory and Movements Ledger workspace items ─────
-- These were created inactive in migration 0031. The UI components and routes
-- are now complete (Phase 4.3), so we activate them.

update app.erp_workspace_items
set is_active = true
where workspace_key = 'inventory'
  and item_key in ('current_inventory', 'movements')
