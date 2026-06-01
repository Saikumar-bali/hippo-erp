-- 0033_grn_inventory_rpcs.sql
-- Phase 4.1: SECURITY DEFINER RPCs for GRN + inventory operations
--
-- RPCs:
--   wh_create_grn_draft   — Create GRN header + lines in draft status
--   wh_update_grn_draft   — Update draft GRN header and/or lines
--   wh_get_grn            — Get GRN with all lines
--   wh_list_grns          — List GRNs with filters
--   wh_post_grn           — Post a draft GRN (atomic: validate → batches → movements → inventory)
--
-- All RPCs return JSONB: {ok: true, data: {...}} or {ok: false, error: '...'}

-- ── 0. Permission helper ──────────────────────────────────────────────────────
-- Reuses the same pattern as wh.current_user_has_product_permission from 0015.

create or replace function wh.current_user_has_grn_permission(
  p_tenant_id uuid,
  p_permission_key text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when auth.uid() is null then true  -- service role / management API bypass
      else exists (
        select 1
        from app.company_role_assignments cra
        join app.company_roles cr on cra.role_id = cr.id and cr.tenant_id = p_tenant_id and cr.is_active = true
        join app.company_role_permissions crp on crp.role_id = cr.id and crp.permission_key = p_permission_key and crp.is_granted = true
        where cra.user_id = auth.uid() and cra.is_active = true
      )
    end;
$$;

-- ── 1. wh_create_grn_draft ─────────────────────────────────────────────────────

create or replace function wh_create_grn_draft(
  p_tenant_id uuid,
  p_grn_number text,
  p_supplier_name text,
  p_received_date date default current_date,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grn_id uuid;
  v_line jsonb;
  v_line_number int := 0;
  v_product_exists boolean;
  v_uom_exists boolean;
  v_bin_exists boolean;
  v_grn_row record;
  v_lines_json jsonb := '[]'::jsonb;
begin
  if not wh.current_user_has_grn_permission(p_tenant_id, 'create_grn') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: create_grn required');
  end if;

  if p_grn_number is null or p_grn_number = '' then
    return jsonb_build_object('ok', false, 'error', 'GRN number is required');
  end if;

  if p_supplier_name is null or p_supplier_name = '' then
    return jsonb_build_object('ok', false, 'error', 'Supplier name is required');
  end if;

  if jsonb_array_length(p_lines) = 0 then
    return jsonb_build_object('ok', false, 'error', 'At least one line item is required');
  end if;

  -- Create GRN header
  insert into wh.grns (tenant_id, grn_number, supplier_name, received_date, notes, created_by)
  values (p_tenant_id, p_grn_number, p_supplier_name, p_received_date, p_notes, auth.uid())
  returning * into v_grn_row;

  v_grn_id := v_grn_row.id;

  -- Process lines
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_line_number := v_line_number + 1;

    -- Validate required fields
    if (v_line->>'product_id') is null then
      raise exception 'Line %: product_id is required', v_line_number;
    end if;

    if (v_line->>'uom_id') is null then
      raise exception 'Line %: uom_id is required', v_line_number;
    end if;

    if (v_line->>'received_qty') is null then
      raise exception 'Line %: received_qty is required', v_line_number;
    end if;

    -- Validate product exists
    select exists(select 1 from wh.products where id = (v_line->>'product_id')::uuid)
    into v_product_exists;
    if not v_product_exists then
      raise exception 'Line %: product not found', v_line_number;
    end if;

    -- Validate UOM exists
    select exists(select 1 from wh.units_of_measure where id = (v_line->>'uom_id')::uuid)
    into v_uom_exists;
    if not v_uom_exists then
      raise exception 'Line %: UOM not found', v_line_number;
    end if;

    -- Validate bin if provided
    if (v_line->>'bin_id') is not null then
      select exists(select 1 from wh.warehouse_bins where id = (v_line->>'bin_id')::uuid)
      into v_bin_exists;
      if not v_bin_exists then
        raise exception 'Line %: bin not found', v_line_number;
      end if;
    end if;

    insert into wh.grn_lines (
      grn_id, line_number, product_id, uom_id,
      received_qty, accepted_qty, rejected_qty,
      batch_number, expiry_date, bin_id, line_status
    )
    values (
      v_grn_id, v_line_number,
      (v_line->>'product_id')::uuid,
      (v_line->>'uom_id')::uuid,
      (v_line->>'received_qty')::numeric,
      coalesce((v_line->>'accepted_qty')::numeric, 0),
      coalesce((v_line->>'rejected_qty')::numeric, 0),
      nullif(trim(v_line->>'batch_number'), ''),
      nullif((v_line->>'expiry_date')::text, '')::date,
      nullif((v_line->>'bin_id')::text, '')::uuid,
      'pending'
    );
  end loop;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'grn_id', v_grn_id,
    'grn_number', p_grn_number
  ));
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'GRN number already exists for this tenant');
  when raise_exception then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

-- ── 2. wh_update_grn_draft ─────────────────────────────────────────────────────

create or replace function wh_update_grn_draft(
  p_grn_id uuid,
  p_supplier_name text default null,
  p_received_date date default null,
  p_notes text default null,
  p_lines jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grn record;
  v_line jsonb;
  v_line_number int := 0;
  v_product_exists boolean;
  v_uom_exists boolean;
  v_bin_exists boolean;
begin
  -- Fetch GRN
  select * into v_grn from wh.grns where id = p_grn_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'GRN not found');
  end if;

  -- Check permission
  if not wh.current_user_has_grn_permission(v_grn.tenant_id, 'update_grn') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: update_grn required');
  end if;

  -- Must be draft
  if v_grn.status != 'draft' then
    return jsonb_build_object('ok', false, 'error', 'Only draft GRNs can be modified');
  end if;

  -- Update header fields
  update wh.grns
  set
    supplier_name  = coalesce(p_supplier_name, supplier_name),
    received_date  = coalesce(p_received_date, received_date),
    notes          = coalesce(p_notes, notes),
    updated_by     = auth.uid(),
    updated_at     = now()
  where id = p_grn_id;

  -- Replace lines if provided
  if p_lines is not null then
    delete from wh.grn_lines where grn_id = p_grn_id;

    for v_line in select * from jsonb_array_elements(p_lines)
    loop
      v_line_number := v_line_number + 1;

      if (v_line->>'product_id') is null then
        raise exception 'Line %: product_id is required', v_line_number;
      end if;
      if (v_line->>'uom_id') is null then
        raise exception 'Line %: uom_id is required', v_line_number;
      end if;
      if (v_line->>'received_qty') is null then
        raise exception 'Line %: received_qty is required', v_line_number;
      end if;

      select exists(select 1 from wh.products where id = (v_line->>'product_id')::uuid)
      into v_product_exists;
      if not v_product_exists then
        raise exception 'Line %: product not found', v_line_number;
      end if;

      select exists(select 1 from wh.units_of_measure where id = (v_line->>'uom_id')::uuid)
      into v_uom_exists;
      if not v_uom_exists then
        raise exception 'Line %: UOM not found', v_line_number;
      end if;

      if (v_line->>'bin_id') is not null then
        select exists(select 1 from wh.warehouse_bins where id = (v_line->>'bin_id')::uuid)
        into v_bin_exists;
        if not v_bin_exists then
          raise exception 'Line %: bin not found', v_line_number;
        end if;
      end if;

      insert into wh.grn_lines (
        grn_id, line_number, product_id, uom_id,
        received_qty, accepted_qty, rejected_qty,
        batch_number, expiry_date, bin_id, line_status
      )
      values (
        p_grn_id, v_line_number,
        (v_line->>'product_id')::uuid,
        (v_line->>'uom_id')::uuid,
        (v_line->>'received_qty')::numeric,
        coalesce((v_line->>'accepted_qty')::numeric, 0),
        coalesce((v_line->>'rejected_qty')::numeric, 0),
        nullif(trim(v_line->>'batch_number'), ''),
        nullif((v_line->>'expiry_date')::text, '')::date,
        nullif((v_line->>'bin_id')::text, '')::uuid,
        'pending'
      );
    end loop;
  end if;

  -- Return updated GRN
  return jsonb_build_object('ok', true, 'data', jsonb_build_object('grn_id', p_grn_id));
exception
  when raise_exception then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

-- ── 3. wh_get_grn ──────────────────────────────────────────────────────────────

create or replace function wh_get_grn(
  p_grn_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grn jsonb;
  v_lines jsonb;
  v_tenant_id uuid;
begin
  select tenant_id into v_tenant_id from wh.grns where id = p_grn_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'GRN not found');
  end if;

  if not wh.current_user_has_grn_permission(v_tenant_id, 'view_grn') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: view_grn required');
  end if;

  select to_jsonb(g) into v_grn
  from wh.grns g
  where g.id = p_grn_id;

  select coalesce(jsonb_agg(to_jsonb(gl) order by gl.line_number), '[]'::jsonb) into v_lines
  from wh.grn_lines gl
  where gl.grn_id = p_grn_id;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'grn', v_grn,
    'lines', v_lines
  ));
end;
$$;

-- ── 4. wh_list_grns ────────────────────────────────────────────────────────────

create or replace function wh_list_grns(
  p_tenant_id uuid,
  p_status text default null,
  p_supplier_name text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grns jsonb;
  v_total int;
begin
  if not wh.current_user_has_grn_permission(p_tenant_id, 'view_grn') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: view_grn required');
  end if;

  select count(*) into v_total
  from wh.grns g
  where g.tenant_id = p_tenant_id
    and (p_status is null or g.status = p_status)
    and (p_supplier_name is null or g.supplier_name ilike '%' || p_supplier_name || '%')
    and (p_date_from is null or g.received_date >= p_date_from)
    and (p_date_to is null or g.received_date <= p_date_to);

  select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at desc), '[]'::jsonb) into v_grns
  from (
    select g.*
    from wh.grns g
    where g.tenant_id = p_tenant_id
      and (p_status is null or g.status = p_status)
      and (p_supplier_name is null or g.supplier_name ilike '%' || p_supplier_name || '%')
      and (p_date_from is null or g.received_date >= p_date_from)
      and (p_date_to is null or g.received_date <= p_date_to)
    order by g.created_at desc
    limit p_limit
    offset p_offset
  ) g;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'grns', v_grns,
    'total', v_total
  ));
end;
$$;

-- ── 5. wh_post_grn ─────────────────────────────────────────────────────────────
-- Atomic posting: validates → creates batches → creates movements → upserts inventory
-- All steps in one transaction. If any step fails, everything rolls back.

create or replace function wh_post_grn(
  p_grn_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grn record;
  v_line record;
  v_batch_id uuid;
  v_new_batch_id uuid;
  v_product_record record;
  v_movement_count int := 0;
begin
  -- Fetch GRN with lock
  select * into v_grn from wh.grns where id = p_grn_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'GRN not found');
  end if;

  -- Check permission
  if not wh.current_user_has_grn_permission(v_grn.tenant_id, 'post_grn') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: post_grn required');
  end if;

  -- Must be draft
  if v_grn.status != 'draft' then
    return jsonb_build_object('ok', false, 'error', 'Only draft GRNs can be posted');
  end if;

  -- Process each line
  for v_line in
    select gl.*, p.batch_tracking, p.expiry_tracking
    from wh.grn_lines gl
    join wh.products p on p.id = gl.product_id
    where gl.grn_id = p_grn_id
    order by gl.line_number
  loop
    -- Validate accepted_qty + rejected_qty <= received_qty
    if v_line.accepted_qty + v_line.rejected_qty > v_line.received_qty then
      return jsonb_build_object('ok', false, 'error',
        format('Line %s: accepted + rejected (%.2f) cannot exceed received (%.2f)',
          v_line.line_number, v_line.accepted_qty + v_line.rejected_qty, v_line.received_qty));
    end if;

    -- Validate batch_number if product uses batch tracking
    if v_line.batch_tracking and (v_line.batch_number is null or v_line.batch_number = '') then
      return jsonb_build_object('ok', false, 'error',
        format('Line %s: batch number is required for this product', v_line.line_number));
    end if;

    -- Validate expiry_date if product uses expiry tracking
    if v_line.expiry_tracking and v_line.expiry_date is null then
      return jsonb_build_object('ok', false, 'error',
        format('Line %s: expiry date is required for this product', v_line.line_number));
    end if;

    -- Validate bin_id when accepted_qty > 0
    if v_line.accepted_qty > 0 and v_line.bin_id is null then
      return jsonb_build_object('ok', false, 'error',
        format('Line %s: bin selection is required for accepted quantity', v_line.line_number));
    end if;

    -- Handle batch
    v_batch_id := null;
    if v_line.batch_number is not null and v_line.batch_number != '' then
      -- Try to find existing batch
      select id into v_batch_id
      from wh.inventory_batches
      where tenant_id = v_grn.tenant_id
        and product_id = v_line.product_id
        and batch_number = v_line.batch_number;

      -- Create new batch if not found
      if not found then
        insert into wh.inventory_batches (
          tenant_id, product_id, batch_number, expiry_date,
          created_from, created_from_id, created_from_line_id
        )
        values (
          v_grn.tenant_id, v_line.product_id, v_line.batch_number, v_line.expiry_date,
          'GRN', v_grn.id, v_line.id
        )
        returning id into v_batch_id;
      end if;
    end if;

    -- Create movement for accepted quantity
    if v_line.accepted_qty > 0 then
      insert into wh.inventory_movements (
        tenant_id, movement_type, source_type, source_id, source_line_id,
        product_id, batch_id, bin_id, qty_delta, created_by
      )
      values (
        v_grn.tenant_id, 'GRN_RECEIPT', 'GRN', v_grn.id, v_line.id,
        v_line.product_id, v_batch_id, v_line.bin_id, v_line.accepted_qty, auth.uid()
      );

      -- Upsert current_inventory
      insert into wh.current_inventory (tenant_id, product_id, batch_id, bin_id, on_hand_qty, available_qty, last_movement_at)
      values (v_grn.tenant_id, v_line.product_id, v_batch_id, v_line.bin_id, v_line.accepted_qty, v_line.accepted_qty, now())
      on conflict (tenant_id, product_id, coalesce(batch_id, '00000000-0000-0000-0000-000000000000'::uuid), bin_id)
      do update set
        on_hand_qty = wh.current_inventory.on_hand_qty + v_line.accepted_qty,
        available_qty = wh.current_inventory.available_qty + v_line.accepted_qty,
        last_movement_at = now(),
        updated_at = now();

      v_movement_count := v_movement_count + 1;
    end if;
  end loop;

  -- Update GRN status to posted
  update wh.grns
  set
    status = 'posted',
    posted_by = auth.uid(),
    posted_at = now(),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_grn_id;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'grn_id', p_grn_id,
    'movements_created', v_movement_count
  ));
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────────

grant execute on function wh.current_user_has_grn_permission(uuid, text) to authenticated;
grant execute on function wh_create_grn_draft(uuid, text, text, date, text, jsonb) to authenticated;
grant execute on function wh_update_grn_draft(uuid, text, date, text, jsonb) to authenticated;
grant execute on function wh_get_grn(uuid) to authenticated;
grant execute on function wh_list_grns(uuid, text, text, date, date, int, int) to authenticated;
grant execute on function wh_post_grn(uuid) to authenticated;
