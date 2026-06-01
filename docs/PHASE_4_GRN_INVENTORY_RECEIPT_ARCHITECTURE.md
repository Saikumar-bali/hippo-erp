# Phase 4: GRN + Inventory Receipt Architecture

## Goal
Plan the Goods Receipt Note (GRN) flow and inventory quantity update architecture before implementing any quantity-changing ERP logic.

## Why Separate from Metadata Engine
GRN is the first serious inventory transaction. It must **not** be implemented as generic JSON CRUD because:
- It creates receipt lines, batch records, bin allocations, movement records, and current quantity updates in a single atomic transaction.
- Inventory quantity changes must use SECURITY DEFINER RPCs with explicit validation — never direct table writes.
- Posting a GRN permanently changes inventory state; reversal must create compensating movements, not mutate existing records.

## Master Data vs Transaction Boundary

| Category | Storage | Write Path |
|----------|---------|------------|
| Products, UOM, Categories | `app.erp_documents` (generic_json) | Generic CRUD via `erp_create_document` etc. |
| Warehouse hierarchy | `app.erp_documents` (generic_json) | Generic CRUD via `erp_create_document` etc. |
| GRN, Inventory Movements, Batches, Current Inventory | `wh.*` physical tables | Explicit RPCs only (`wh_create_grn_draft`, `wh_post_grn`, etc.) |

## Physical Table Design

### 1. `wh.grns` — GRN Header

```sql
create table wh.grns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references app.companies(id),
  grn_number text not null,
  supplier_name text not null,
  received_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'posted', 'cancelled')),
  qc_status text not null default 'pending' check (qc_status in ('pending', 'accepted', 'rejected', 'partial')),
  notes text,
  created_by uuid not null references core.users(id),
  updated_by uuid references core.users(id),
  posted_by uuid references core.users(id),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, grn_number)
);
```

### 2. `wh.grn_lines` — GRN Line Items

```sql
create table wh.grn_lines (
  id uuid primary key default gen_random_uuid(),
  grn_id uuid not null references wh.grns(id) on delete cascade,
  line_number int not null,
  product_id uuid not null references app.erp_documents(id),
  uom_id uuid not null references app.erp_documents(id),
  received_qty numeric not null check (received_qty > 0),
  accepted_qty numeric not null default 0 check (accepted_qty >= 0),
  rejected_qty numeric not null default 0 check (rejected_qty >= 0),
  batch_number text,
  expiry_date date,
  warehouse_id uuid references app.erp_documents(id),
  zone_id uuid references app.erp_documents(id),
  aisle_id uuid references app.erp_documents(id),
  rack_id uuid references app.erp_documents(id),
  shelf_id uuid references app.erp_documents(id),
  bin_id uuid references app.erp_documents(id),
  line_status text not null default 'pending' check (line_status in ('pending', 'accepted', 'rejected', 'partial')),
  created_at timestamptz not null default now(),
  unique (grn_id, line_number)
);
```

### 3. `wh.inventory_batches` — Batch / Lot Tracking

```sql
create table wh.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references app.companies(id),
  product_id uuid not null references app.erp_documents(id),
  batch_number text not null,
  expiry_date date,
  created_from text not null,  -- 'GRN'
  created_from_id uuid not null,
  created_from_line_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, product_id, batch_number)
);
```

### 4. `wh.inventory_movements` — Immutable Movement Ledger

```sql
create table wh.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references app.companies(id),
  movement_type text not null check (movement_type in ('GRN_RECEIPT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'REVERSAL')),
  source_type text not null,  -- 'GRN'
  source_id uuid not null,     -- FK to wh.grns.id
  source_line_id uuid,         -- FK to wh.grn_lines.id
  product_id uuid not null references app.erp_documents(id),
  batch_id uuid references wh.inventory_batches(id),
  warehouse_id uuid references app.erp_documents(id),
  zone_id uuid references app.erp_documents(id),
  aisle_id uuid references app.erp_documents(id),
  rack_id uuid references app.erp_documents(id),
  shelf_id uuid references app.erp_documents(id),
  bin_id uuid references app.erp_documents(id),
  qty_delta numeric not null,
  movement_date timestamptz not null default now(),
  created_by uuid not null references core.users(id),
  created_at timestamptz not null default now()
);

-- Movements are append-only. No UPDATE or DELETE.
```

### 5. `wh.current_inventory` — Current Quantity Snapshot

```sql
create table wh.current_inventory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references app.companies(id),
  product_id uuid not null references app.erp_documents(id),
  batch_id uuid references wh.inventory_batches(id),
  warehouse_id uuid references app.erp_documents(id),
  zone_id uuid references app.erp_documents(id),
  aisle_id uuid references app.erp_documents(id),
  rack_id uuid references app.erp_documents(id),
  shelf_id uuid references app.erp_documents(id),
  bin_id uuid not null references app.erp_documents(id),
  on_hand_qty numeric not null default 0 check (on_hand_qty >= 0),
  available_qty numeric not null default 0 check (available_qty >= 0),
  last_movement_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, product_id, batch_id, bin_id)
);
```

## RPC / Service Boundary

All inventory transactions go through explicit SECURITY DEFINER functions. No direct table writes from the frontend.

### Draft Operations (editable)

| RPC | Purpose |
|-----|---------|
| `wh_create_grn_draft` | Create GRN header + lines in draft status |
| `wh_update_grn_draft` | Update draft GRN header and/or lines |
| `wh_get_grn` | Get GRN with all lines (draft or posted) |
| `wh_list_grns` | List GRNs for a company with filters (status, date range, supplier) |

### Posting Operation (atomic, irreversible)

| RPC | Purpose |
|-----|---------|
| `wh_post_grn` | Post a draft GRN — validates, creates batches, movements, updates current inventory in one transaction |

### Posting Logic (inside `wh_post_grn`)

1. Validate GRN is in `draft` status
2. Validate permission (`create_grn` or similar)
3. For each line:
   - Validate `received_qty > 0`
   - Validate `accepted_qty + rejected_qty <= received_qty`
   - If product uses batch tracking and no batch_number provided, auto-generate one
   - If product uses expiry tracking, validate expiry_date is provided
   - Validate bin_id is provided for accepted_qty > 0
   - Create inventory batch record if new batch
   - Create inventory movement row (qty_delta = +accepted_qty)
   - Upsert current_inventory (on_hand_qty += accepted_qty, available_qty += accepted_qty)
4. Update GRN status to `posted`, set `posted_by`, `posted_at`
5. All steps in a single PostgreSQL transaction — if any step fails, everything rolls back

### Future / Optional

| RPC | Purpose |
|-----|---------|
| `wh_cancel_grn` | Create reversal movements for a posted GRN (Phase 4+ or Phase 5) |

## Validations

| Rule | Where | Error |
|------|-------|-------|
| `received_qty > 0` | RPC | "Received quantity must be greater than zero" |
| `accepted_qty >= 0` | RPC | "Accepted quantity cannot be negative" |
| `rejected_qty >= 0` | RPC | "Rejected quantity cannot be negative" |
| `accepted_qty + rejected_qty <= received_qty` | RPC | "Accepted + rejected cannot exceed received quantity" |
| batch_number required if product uses batch tracking | RPC | "Batch number is required for this product" |
| expiry_date required if product uses expiry tracking | RPC | "Expiry date is required for this product" |
| bin_id required for accepted_qty > 0 | RPC | "Bin selection is required for accepted quantity" |
| GRN must be in draft status to edit | RPC | "Only draft GRNs can be modified" |
| Posted GRN cannot be edited | RPC | "Posted GRN cannot be modified" |

## Permission Model

| Permission Key | Purpose |
|---------------|---------|
| `create_grn` | Create and edit draft GRNs |
| `post_grn` | Post GRN (may be same as create in smaller companies) |
| `view_grn` | View GRN details |
| `delete_grn` | Delete draft GRN |
| `cancel_grn` | Cancel/reverse posted GRN (future) |

## Security / RLS

- `wh.grns`, `wh.grn_lines`: RLS enabled, company-scoped SELECT for members, write only through SECURITY DEFINER RPCs
- `wh.inventory_movements`: RLS enabled, read-only for members, insert only through SECURITY DEFINER RPCs
- `wh.current_inventory`: RLS enabled, read for members, upsert only through SECURITY DEFINER RPCs
- `wh.inventory_batches`: RLS enabled, read for members, insert through SECURITY DEFINER RPCs

## UI Strategy

GRN appears in the sidebar through metadata workspace items:

```
Purchasing
  GRN
```

But GRN operations use **dedicated React components**, not the generic `MetadataDataTable` or `DynamicListPage`, because:
- GRN has a header + line items grid (not a flat table)
- Posting requires explicit confirmation with validation summary
- Posted GRN must render as a read-only document view with a printed format

### Planned UI Components
| Component | Purpose |
|-----------|---------|
| `GRNListPage` | List GRNs with status filters, create button |
| `GRNFormPage` | Header fields + dynamic line item grid for draft editing |
| `GRNDetailPage` | Read-only posted GRN view |

## Simulation Plan

Create `tests/simulations/grn_inventory_receipt_flow.sql`

### Simulation Checks
1. Create draft GRN via `wh_create_grn_draft`
2. Add line item via `wh_update_grn_draft`
3. Verify GRN is in draft status
4. Post GRN via `wh_post_grn`
5. Verify GRN status = posted
6. Verify inventory movement row created with qty_delta = accepted_qty
7. Verify current_inventory updated with on_hand_qty = accepted_qty
8. Verify batch created if product uses batch tracking
9. Verify rejected quantity does not increase current_inventory
10. Verify duplicate posting is blocked
11. Verify draft edit is blocked after posting
12. Rollback/cleanup at end

## Browser Verification Plan

### Manual Verification Flow
1. Navigate to Purchasing > GRN
2. Click "New GRN" — GRN form opens
3. Fill supplier name, received date, notes
4. Add product line — select product from link dropdown
5. Enter received_qty, accepted_qty, rejected_qty
6. Select warehouse/bin hierarchy
7. Save draft — verify draft status
8. Open GRN — verify line items preserved
9. Click "Post GRN" — confirmation dialog
10. Confirm posting — verify status changes to "posted"
11. Verify current inventory increased for accepted product/batch/bin
12. Verify movement record exists
13. Attempt to edit posted GRN — verify blocked

## Out of Scope for Phase 4
- Purchase Orders (separate phase)
- Supplier invoices / Payments
- Stock transfers / Adjustments
- Cycle counts
- Reservations
- Valuation / FIFO / weighted average
- Full workflow engine
- Naming series engine (use `grn_number` for now)
