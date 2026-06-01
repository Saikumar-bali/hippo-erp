-- 0038_grn_cancellation_reversal.sql
-- Phase 4.6: GRN cancellation / reversal implementation
--
-- Changes from 0030/0033:
--   1. Add cancelled_by/cancelled_at/cancel_reason to wh.grns
--   2. Add is_reversal/reversal_of_movement_id to wh.inventory_movements
--   3. Seed cancel_grn permission key
--   4. Grant cancel_grn to owner, admin, warehouse_manager
--   5. Implement wh_cancel_grn RPC

-- ── 1. wh.grns — cancellation columns ─────────────────────────────────────────

alter table wh.grns
  add column if not exists cancelled_by uuid,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text;

-- ── 2. wh.inventory_movements — reversal columns ──────────────────────────────

alter table wh.inventory_movements
  add column if not exists is_reversal boolean not null default false,
  add column if not exists reversal_of_movement_id uuid references wh.inventory_movements(id);

create index if not exists idx_inventory_movements_reversal
  on wh.inventory_movements (reversal_of_movement_id)
  where reversal_of_movement_id is not null;

-- ── 3. Seed cancel_grn permission ─────────────────────────────────────────────

insert into app.permissions (
  permission_key, module_key, module_label, permission_label, description, sort_order
) values (
  'cancel_grn', 'grn', 'GRN', 'Cancel GRN', 'Cancel a posted GRN document.', 26
)
on conflict (permission_key) do update
set
  module_key = excluded.module_key,
  module_label = excluded.module_label,
  permission_label = excluded.permission_label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- ── 4. Grant cancel_grn to system roles ───────────────────────────────────────

insert into app.role_permission_grants (role, permission_key, is_granted)
select r.role, p.permission_key, true
from (values
  ('owner'::app.role_type, true),
  ('admin'::app.role_type, true)
) as r(role, grant_all)
cross join (values
  ('cancel_grn'::text)
) as p(permission_key)
where r.grant_all
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

insert into app.role_permission_grants (role, permission_key, is_granted)
select 'warehouse_manager'::app.role_type, p.permission_key, true
from (values
  ('cancel_grn'::text)
) as p(permission_key)
on conflict (role, permission_key) do update
set is_granted = excluded.is_granted, updated_at = now();

-- ── 5. Grant cancel_grn to existing company roles ─────────────────────────────

do $$
declare
  v_company record;
  v_role record;
  v_perm_keys text[] := array['cancel_grn'];
  v_perm_key text;
begin
  for v_company in select id from app.tenants loop
    for v_role in
      select cr.id, cr.role_key
      from app.company_roles cr
      where cr.tenant_id = v_company.id
        and cr.role_key in ('owner', 'admin', 'warehouse_manager')
        and cr.is_active = true
    loop
      foreach v_perm_key in array v_perm_keys loop
        if not exists (
          select 1 from app.company_role_permissions
          where role_id = v_role.id and permission_key = v_perm_key
        ) then
          insert into app.company_role_permissions (role_id, permission_key, is_granted)
          values (v_role.id, v_perm_key, true);
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;

-- ── 6. wh_cancel_grn RPC ──────────────────────────────────────────────────────

create or replace function wh_cancel_grn(
  p_grn_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grn record;
  v_line record;
  v_original_movement record;
  v_ci record;
  v_reversal_id uuid;
  v_reversals_created int := 0;
  v_batch_id uuid;
begin
  -- 1. Lock GRN row
  select * into v_grn
  from wh.grns
  where id = p_grn_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'GRN not found');
  end if;

  -- 2. Validate status = posted
  if v_grn.status != 'posted' then
    return jsonb_build_object('ok', false, 'error', 'Only posted GRNs can be cancelled');
  end if;

  -- 3. Validate reason
  if p_reason is null or trim(p_reason) = '' then
    return jsonb_build_object('ok', false, 'error', 'Cancellation reason is required');
  end if;

  -- 4. Check cancel_grn permission
  if not wh.current_user_has_grn_permission(v_grn.tenant_id, 'cancel_grn') then
    return jsonb_build_object('ok', false, 'error', 'Permission denied: cancel_grn required');
  end if;

  -- 5. PASS 1 — Validate all lines before any writes
  for v_line in
    select gl.id, gl.line_number, gl.product_id, gl.bin_id, gl.accepted_qty,
           gl.batch_number
    from wh.grn_lines gl
    where gl.grn_id = p_grn_id
      and gl.accepted_qty > 0
    order by gl.line_number
  loop
    -- 5a. Find original GRN_RECEIPT movement (stores batch_id)
    select im.id, im.qty_delta, im.batch_id, im.bin_id
    into v_original_movement
    from wh.inventory_movements im
    where im.source_type = 'GRN'
      and im.source_id = p_grn_id
      and im.source_line_id = v_line.id
      and im.movement_type = 'GRN_RECEIPT'
    limit 1;

    if not found then
      return jsonb_build_object('ok', false, 'error',
        format('Original GRN_RECEIPT movement not found for line %s', v_line.line_number));
    end if;

    -- 5b. Use batch_id from the original movement
    v_batch_id := v_original_movement.batch_id;

    -- 5c. Lock current_inventory row for this product/batch/bin
    select * into v_ci
    from wh.current_inventory ci
    where ci.tenant_id = v_grn.tenant_id
      and ci.product_id = v_line.product_id
      and ci.batch_id is not distinct from v_batch_id
      and ci.bin_id is not distinct from v_original_movement.bin_id
    for update;

    -- 5d. Stock consumption guard
    if found then
      if v_ci.on_hand_qty < v_line.accepted_qty then
        return jsonb_build_object('ok', false, 'error',
          format('Insufficient stock to reverse line %s: on-hand %s, needed %s',
            v_line.line_number, v_ci.on_hand_qty, v_line.accepted_qty));
      end if;
      if v_ci.available_qty < v_line.accepted_qty then
        return jsonb_build_object('ok', false, 'error',
          format('Insufficient available stock to reverse line %s: available %s, needed %s',
            v_line.line_number, v_ci.available_qty, v_line.accepted_qty));
      end if;
    else
      -- No current_inventory row exists; stock is 0 < accepted_qty
      return jsonb_build_object('ok', false, 'error',
        format('No inventory found for line %s: cannot reverse', v_line.line_number));
    end if;
  end loop;

  -- 6. PASS 2 — Execute reversals
  for v_line in
    select gl.id, gl.line_number, gl.product_id, gl.bin_id, gl.accepted_qty,
           gl.batch_number
    from wh.grn_lines gl
    where gl.grn_id = p_grn_id
      and gl.accepted_qty > 0
    order by gl.line_number
  loop
    -- 6a. Find original movement again (still exists)
    select im.id, im.qty_delta, im.batch_id, im.bin_id
    into v_original_movement
    from wh.inventory_movements im
    where im.source_type = 'GRN'
      and im.source_id = p_grn_id
      and im.source_line_id = v_line.id
      and im.movement_type = 'GRN_RECEIPT'
    limit 1;

    v_batch_id := v_original_movement.batch_id;

    -- 6b. Insert reversal movement
    insert into wh.inventory_movements (
      tenant_id, movement_type, source_type, source_id, source_line_id,
      product_id, batch_id, bin_id, qty_delta, movement_date, created_by,
      is_reversal, reversal_of_movement_id
    )
    values (
      v_grn.tenant_id, 'REVERSAL', 'GRN', p_grn_id, v_line.id,
      v_line.product_id, v_batch_id, v_original_movement.bin_id,
      -(v_line.accepted_qty), now(), auth.uid(),
      true, v_original_movement.id
    )
    returning id into v_reversal_id;

    -- 6c. Decrement current_inventory
    update wh.current_inventory ci
    set
      on_hand_qty = ci.on_hand_qty - v_line.accepted_qty,
      available_qty = ci.available_qty - v_line.accepted_qty,
      last_movement_at = now(),
      updated_at = now()
    where ci.tenant_id = v_grn.tenant_id
      and ci.product_id = v_line.product_id
      and ci.batch_id is not distinct from v_batch_id
      and ci.bin_id is not distinct from v_original_movement.bin_id;

    v_reversals_created := v_reversals_created + 1;
  end loop;

  -- 7. Deactivate batches created solely by this GRN
  update wh.inventory_batches ib
  set is_active = false
  where ib.created_from = 'GRN'
    and ib.created_from_id = p_grn_id
    and ib.is_active = true;

  -- 8. Update GRN status to cancelled
  update wh.grns
  set
    status = 'cancelled',
    cancel_reason = p_reason,
    cancelled_by = auth.uid(),
    cancelled_at = now(),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_grn_id;

  return jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'grn_id', p_grn_id,
    'reversals_created', v_reversals_created
  ));
exception
  when others then
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;
