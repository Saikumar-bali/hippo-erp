-- 0032_grn_inventory_rls.sql
-- Phase 4.1: RLS policies for GRN + inventory transaction tables
--
-- Principles:
--   - Company members can READ their company's data.
--   - Direct INSERT/UPDATE/DELETE via REST/gRaphQL is blocked for frontend users.
--   - All writes must go through SECURITY DEFINER RPCs (which bypass RLS).
--   - RPCs validate permissions explicitly.

-- ── 1. wh.grns — members can read; writes through RPC only ─────────────────────

drop policy if exists grns_select on wh.grns;
create policy grns_select on wh.grns
  for select
  to authenticated
  using (app.current_user_is_tenant_member(tenant_id));

drop policy if exists grns_insert on wh.grns;
create policy grns_insert on wh.grns
  for insert
  to authenticated
  with check (false);

drop policy if exists grns_update on wh.grns;
create policy grns_update on wh.grns
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists grns_delete on wh.grns;
create policy grns_delete on wh.grns
  for delete
  to authenticated
  using (false);

-- ── 2. wh.grn_lines — same pattern ────────────────────────────────────────────

drop policy if exists grn_lines_select on wh.grn_lines;
create policy grn_lines_select on wh.grn_lines
  for select
  to authenticated
  using (
    exists (
      select 1 from wh.grns g
      where g.id = grn_id
        and app.current_user_is_tenant_member(g.tenant_id)
    )
  );

drop policy if exists grn_lines_insert on wh.grn_lines;
create policy grn_lines_insert on wh.grn_lines
  for insert
  to authenticated
  with check (false);

drop policy if exists grn_lines_update on wh.grn_lines;
create policy grn_lines_update on wh.grn_lines
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists grn_lines_delete on wh.grn_lines;
create policy grn_lines_delete on wh.grn_lines
  for delete
  to authenticated
  using (false);

-- ── 3. wh.inventory_batches — members can read; writes through RPC only ───────

drop policy if exists inventory_batches_select on wh.inventory_batches;
create policy inventory_batches_select on wh.inventory_batches
  for select
  to authenticated
  using (app.current_user_is_tenant_member(tenant_id));

drop policy if exists inventory_batches_insert on wh.inventory_batches;
create policy inventory_batches_insert on wh.inventory_batches
  for insert
  to authenticated
  with check (false);

drop policy if exists inventory_batches_update on wh.inventory_batches;
create policy inventory_batches_update on wh.inventory_batches
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists inventory_batches_delete on wh.inventory_batches;
create policy inventory_batches_delete on wh.inventory_batches
  for delete
  to authenticated
  using (false);

-- ── 4. wh.inventory_movements — members can read; NO write for frontend ───────

drop policy if exists inventory_movements_select on wh.inventory_movements;
create policy inventory_movements_select on wh.inventory_movements
  for select
  to authenticated
  using (app.current_user_is_tenant_member(tenant_id));

drop policy if exists inventory_movements_insert on wh.inventory_movements;
create policy inventory_movements_insert on wh.inventory_movements
  for insert
  to authenticated
  with check (false);

drop policy if exists inventory_movements_update on wh.inventory_movements;
create policy inventory_movements_update on wh.inventory_movements
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists inventory_movements_delete on wh.inventory_movements;
create policy inventory_movements_delete on wh.inventory_movements
  for delete
  to authenticated
  using (false);

-- ── 5. wh.current_inventory — members can read; NO write for frontend ─────────

drop policy if exists current_inventory_select on wh.current_inventory;
create policy current_inventory_select on wh.current_inventory
  for select
  to authenticated
  using (app.current_user_is_tenant_member(tenant_id));

drop policy if exists current_inventory_insert on wh.current_inventory;
create policy current_inventory_insert on wh.current_inventory
  for insert
  to authenticated
  with check (false);

drop policy if exists current_inventory_update on wh.current_inventory;
create policy current_inventory_update on wh.current_inventory
  for update
  to authenticated
  using (false)
  with check (false);

drop policy if exists current_inventory_delete on wh.current_inventory;
create policy current_inventory_delete on wh.current_inventory
  for delete
  to authenticated
  using (false);
