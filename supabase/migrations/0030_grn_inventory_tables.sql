-- 0030_grn_inventory_tables.sql
-- Phase 4.1: GRN + Inventory Receipt physical tables
-- Schema: wh (alongside existing wh.products, wh.warehouse_bins, etc.)
--
-- Five new tables:
--   wh.grns              — GRN header
--   wh.grn_lines         — GRN line items
--   wh.inventory_batches — Batch/lot tracking (replaces legacy wh.inventory_batches)
--   wh.inventory_movements — Immutable movement ledger (replaces legacy wh.inventory_movements)
--   wh.current_inventory — Current on-hand + available qty snapshot (replaces legacy wh.inventory_stock)
--
-- Key design decisions:
--   - FK references use PHYSICAL tables (wh.products, wh.units_of_measure, wh.warehouse_bins)
--     because Product Master and warehouse hierarchy still use physical tables.
--   - tenant_id follows existing convention (not company_id).
--   - batch_id uses NULLS NOT DISTINCT on unique constraints (PG15+)
--     to prevent duplicate NULL batch_id rows.
--   - Movements are append-only: no UPDATE/DELETE policies for frontend.

-- ── 0. Ensure utility function exists ────────────────────────────────────────

create or replace function app.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── 0a. Drop legacy tables from 0001 that conflict with new design ─────────────
-- These tables were created in the initial scaffolding but never used in production.
-- They are replaced by the new Phase 4 tables below.
-- We drop CASCADE to remove any FKs, triggers, or dependent objects.

drop table if exists wh.inventory_stock cascade;
drop table if exists wh.grn_lines cascade;
drop table if exists wh.grn_headers cascade;
drop table if exists wh.inventory_movements cascade;
drop table if exists wh.inventory_batches cascade;

-- Also drop old legacy warehouse/physical tables that conflict with metadata-driven approach
drop table if exists wh.cycle_count_lines cascade;
drop table if exists wh.cycle_counts cascade;
drop table if exists wh.stock_transfer_lines cascade;
drop table if exists wh.stock_transfers cascade;
drop table if exists wh.stock_adjustments cascade;
drop table if exists wh.inventory_reservations cascade;
drop table if exists wh.reorder_alerts cascade;
drop table if exists wh.inventory_valuation cascade;
drop table if exists wh.grading_templates cascade;

-- ── 1. wh.grns — GRN Header ───────────────────────────────────────────────────

create table wh.grns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id),
  grn_number text not null,
  supplier_name text not null,
  received_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'posted', 'cancelled')),
  qc_status text not null default 'pending' check (qc_status in ('pending', 'accepted', 'rejected', 'partial')),
  notes text,
  created_by uuid,
  updated_by uuid,
  posted_by uuid,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, grn_number)
);

-- ── 2. wh.grn_lines — GRN Line Items ──────────────────────────────────────────

create table wh.grn_lines (
  id uuid primary key default gen_random_uuid(),
  grn_id uuid not null references wh.grns(id) on delete cascade,
  line_number int not null,
  product_id uuid not null references wh.products(id),
  uom_id uuid not null references wh.units_of_measure(id),
  received_qty numeric not null check (received_qty > 0),
  accepted_qty numeric not null default 0 check (accepted_qty >= 0),
  rejected_qty numeric not null default 0 check (rejected_qty >= 0),
  batch_number text,
  expiry_date date,
  bin_id uuid references wh.warehouse_bins(id),
  line_status text not null default 'pending' check (line_status in ('pending', 'accepted', 'rejected', 'partial')),
  created_at timestamptz not null default now(),
  unique (grn_id, line_number)
);

-- ── 3. wh.inventory_batches — Batch / Lot Tracking ─────────────────────────────

create table wh.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id),
  product_id uuid not null references wh.products(id),
  batch_number text not null,
  expiry_date date,
  created_from text not null check (created_from in ('GRN')),
  created_from_id uuid not null,
  created_from_line_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, product_id, batch_number)
);

-- ── 4. wh.inventory_movements — Immutable Movement Ledger ──────────────────────

create table wh.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id),
  movement_type text not null check (movement_type in ('GRN_RECEIPT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'REVERSAL')),
  source_type text not null,
  source_id uuid not null,
  source_line_id uuid,
  product_id uuid not null references wh.products(id),
  batch_id uuid references wh.inventory_batches(id),
  bin_id uuid references wh.warehouse_bins(id),
  qty_delta numeric not null,
  movement_date timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_tenant on wh.inventory_movements(tenant_id);
create index if not exists idx_inventory_movements_product on wh.inventory_movements(product_id);
create index if not exists idx_inventory_movements_source on wh.inventory_movements(source_type, source_id);

comment on table wh.inventory_movements is 'Append-only movement ledger. No UPDATE or DELETE from frontend.';

-- ── 5. wh.current_inventory — Current Quantity Snapshot ────────────────────────
-- Uses NULLS NOT DISTINCT (PG15+) to prevent duplicate NULL batch_id rows.

create table wh.current_inventory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id),
  product_id uuid not null references wh.products(id),
  batch_id uuid references wh.inventory_batches(id),
  bin_id uuid not null references wh.warehouse_bins(id),
  on_hand_qty numeric not null default 0 check (on_hand_qty >= 0),
  available_qty numeric not null default 0 check (available_qty >= 0),
  last_movement_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique constraint with NULLS NOT DISTINCT: treats NULL batch_id as equal
-- so (product=A, batch=NULL, bin=X) can only appear once per tenant.
-- Requires PostgreSQL 15+ (available on Supabase Cloud).
create unique index if not exists idx_current_inventory_unique
  on wh.current_inventory (tenant_id, product_id, coalesce(batch_id, '00000000-0000-0000-0000-000000000000'::uuid), bin_id);

comment on table wh.current_inventory is 'Current on-hand/available quantity snapshot. Upserted only through RPC.';

-- ── 6. Enable Row-Level Security ─────────────────────────────────────────────

alter table wh.grns enable row level security;
alter table wh.grn_lines enable row level security;
alter table wh.inventory_batches enable row level security;
alter table wh.inventory_movements enable row level security;
alter table wh.current_inventory enable row level security;

-- ── 7. Triggers for updated_at ────────────────────────────────────────────────

create trigger trg_grns_updated_at
  before update on wh.grns
  for each row
  execute function app.update_updated_at_column();

create trigger trg_current_inventory_updated_at
  before update on wh.current_inventory
  for each row
  execute function app.update_updated_at_column();

-- ── 8. Grants ──────────────────────────────────────────────────────────────────

grant usage on schema wh to authenticated;
grant select on wh.grns to authenticated;
grant select on wh.grn_lines to authenticated;
grant select on wh.inventory_batches to authenticated;
grant select on wh.inventory_movements to authenticated;
grant select on wh.current_inventory to authenticated;
