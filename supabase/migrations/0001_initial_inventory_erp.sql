create extension if not exists "pgcrypto";

create schema if not exists app;
create schema if not exists wh;
create schema if not exists private;

create type app.role_type as enum ('owner','admin','warehouse_manager','stock_operator','viewer','auditor');
create type wh.movement_type as enum ('GRN','SALES_DISPATCH','PRODUCTION_ISSUE','PRODUCTION_RETURN','STOCK_TRANSFER','STOCK_ADJUSTMENT','SCRAP','CYCLE_COUNT','RETURN');

create table if not exists app.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app.tenant_members (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  user_id uuid not null references app.profiles(id) on delete cascade,
  role app.role_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, app
as $$
begin
  insert into app.profiles(id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create table if not exists wh.warehouses (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  warehouse_code text not null, name text not null, is_active boolean not null default true,
  created_by uuid references app.profiles(id), updated_by uuid references app.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, warehouse_code)
);
create table if not exists wh.warehouse_zones (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  warehouse_id uuid not null references wh.warehouses(id) on delete cascade, zone_code text not null, name text not null,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, warehouse_id, zone_code)
);
create table if not exists wh.warehouse_aisles (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  zone_id uuid not null references wh.warehouse_zones(id) on delete cascade, aisle_code text not null, name text not null,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, zone_id, aisle_code)
);
create table if not exists wh.warehouse_racks (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  aisle_id uuid not null references wh.warehouse_aisles(id) on delete cascade, rack_code text not null, name text not null,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, aisle_id, rack_code)
);
create table if not exists wh.warehouse_shelves (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  rack_id uuid not null references wh.warehouse_racks(id) on delete cascade, shelf_code text not null, name text not null,
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, rack_id, shelf_code)
);
create table if not exists wh.warehouse_bins (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  shelf_id uuid not null references wh.warehouse_shelves(id) on delete cascade, bin_code text not null, name text not null,
  capacity numeric(14,2) not null default 0 check (capacity >= 0), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, shelf_id, bin_code)
);

create table if not exists wh.product_categories (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  code text not null, name text not null, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create table if not exists wh.units_of_measure (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  code text not null, name text not null, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create table if not exists wh.products (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  category_id uuid not null references wh.product_categories(id), uom_id uuid not null references wh.units_of_measure(id),
  sku text not null, barcode text, name text not null, reorder_point numeric(14,2) not null default 0 check (reorder_point >= 0),
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, sku)
);
create table if not exists wh.grading_templates (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  code text not null, name text not null, rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists wh.inventory_batches (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  product_id uuid not null references wh.products(id), batch_no text not null, mfg_date date, expiry_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, product_id, batch_no)
);

create table if not exists wh.inventory_stock (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  product_id uuid not null references wh.products(id), batch_id uuid references wh.inventory_batches(id),
  warehouse_id uuid not null references wh.warehouses(id), bin_id uuid references wh.warehouse_bins(id),
  quantity numeric(14,2) not null default 0 check (quantity >= 0),
  reserved_quantity numeric(14,2) not null default 0 check (reserved_quantity >= 0),
  average_cost numeric(14,4) not null default 0 check (average_cost >= 0),
  last_updated timestamptz not null default now(),
  unique (tenant_id, product_id, batch_id, warehouse_id, bin_id)
);

create table if not exists wh.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  movement_no text not null unique,
  movement_type wh.movement_type not null,
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  product_id uuid not null references wh.products(id),
  batch_id uuid references wh.inventory_batches(id),
  source_warehouse_id uuid references wh.warehouses(id), source_bin_id uuid references wh.warehouse_bins(id),
  destination_warehouse_id uuid references wh.warehouses(id), destination_bin_id uuid references wh.warehouse_bins(id),
  quantity numeric(14,2) not null check (quantity >= 0),
  unit_cost numeric(14,4) not null default 0 check (unit_cost >= 0),
  total_cost numeric(14,4) not null default 0 check (total_cost >= 0),
  reference_table text, reference_id uuid,
  created_by uuid references app.profiles(id), movement_date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists wh.grn_headers (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  grn_no text not null, warehouse_id uuid not null references wh.warehouses(id), supplier_name text not null,
  status text not null default 'draft', pending_qc boolean not null default true,
  created_by uuid references app.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, grn_no)
);
create table if not exists wh.grn_lines (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  grn_id uuid not null references wh.grn_headers(id) on delete cascade, product_id uuid not null references wh.products(id),
  batch_id uuid references wh.inventory_batches(id), received_qty numeric(14,2) not null default 0 check (received_qty >= 0),
  unit_cost numeric(14,4) not null default 0 check (unit_cost >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists wh.stock_adjustments (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  adjustment_no text not null, warehouse_id uuid not null references wh.warehouses(id), reason text not null,
  status text not null default 'pending', approved_by uuid references app.profiles(id), created_by uuid references app.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (tenant_id, adjustment_no)
);
create table if not exists wh.stock_transfers (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  transfer_no text not null, source_warehouse_id uuid not null references wh.warehouses(id), destination_warehouse_id uuid not null references wh.warehouses(id),
  status text not null default 'pending', created_by uuid references app.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (tenant_id, transfer_no)
);
create table if not exists wh.stock_transfer_lines (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  transfer_id uuid not null references wh.stock_transfers(id) on delete cascade, product_id uuid not null references wh.products(id),
  batch_id uuid references wh.inventory_batches(id), quantity numeric(14,2) not null check (quantity >= 0),
  source_bin_id uuid references wh.warehouse_bins(id), destination_bin_id uuid references wh.warehouse_bins(id)
);

create table if not exists wh.cycle_counts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  count_no text not null, warehouse_id uuid not null references wh.warehouses(id), status text not null default 'open',
  created_by uuid references app.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (tenant_id, count_no)
);
create table if not exists wh.cycle_count_lines (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  cycle_count_id uuid not null references wh.cycle_counts(id) on delete cascade, product_id uuid not null references wh.products(id),
  batch_id uuid references wh.inventory_batches(id), expected_qty numeric(14,2) not null default 0 check (expected_qty >= 0),
  counted_qty numeric(14,2) not null default 0 check (counted_qty >= 0)
);

create table if not exists wh.inventory_reservations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  stock_id uuid not null references wh.inventory_stock(id), reference_no text not null,
  quantity numeric(14,2) not null check (quantity >= 0), status text not null default 'active',
  created_by uuid references app.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists wh.reorder_alerts (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  product_id uuid not null references wh.products(id), current_qty numeric(14,2) not null check (current_qty >= 0),
  reorder_point numeric(14,2) not null check (reorder_point >= 0), severity text not null default 'low',
  is_resolved boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists wh.inventory_valuation (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references app.tenants(id) on delete cascade,
  product_id uuid not null references wh.products(id), valuation_date date not null default current_date,
  quantity numeric(14,2) not null check (quantity >= 0), average_cost numeric(14,4) not null check (average_cost >= 0),
  total_value numeric(14,4) not null check (total_value >= 0),
  unique (tenant_id, product_id, valuation_date)
);
