# AI Run Report: Phase 4.1 — GRN + Inventory Receipt Backend Foundation

**Date:** 2026-06-01
**Commit:** `068ce35`
**Branch:** `phase-2.5-metadata-engine`

## Summary

Implemented the backend foundation for GRN (Goods Receipt Note) and inventory receipt on Supabase Cloud. Created 4 migrations (0030–0033) with 5 physical tables, RLS, SECURITY DEFINER RPCs, permissions, and workspace metadata. All verified via simulation, typecheck, lint, test, and build.

## Schema Changes

### Tables Created (migration 0030)

| Table | Purpose |
|-------|---------|
| `wh.grns` | GRN header — draft/posted/cancelled status, tenant-scoped, audit columns |
| `wh.grn_lines` | Line items with product, UOM, batch, bin, quantities (received/rejected/accepted) |
| `wh.inventory_batches` | Batch/lot tracking per product + tenant, optional expiry + best-before dates |
| `wh.inventory_movements` | Immutable append-only ledger with qty_delta, before/after snapshots, reference to source GRN |
| `wh.current_inventory` | Current on-hand + available qty per product+batch+bin, upserted on posting |

### Dropped Legacy Tables (migration 0030)

- `wh.inventory_stock`, `wh.grn_headers`, `wh.grn_lines`, `wh.inventory_movements`, `wh.inventory_batches` — legacy scaffolding from migration 0001, incompatible with new design

### Permissions Seeded (migration 0031)

- `delete_grn`, `view_inventory_movements`, `view_current_inventory` — added to `app.permissions`
- Purchasing workspace activated; GRN workspace item activated; Movements/Current Stock items added (inactive)
- Keys granted to: owner, admin, warehouse_manager, viewer, auditor, stock_operator (via `app.role_permission_grants` and `app.company_role_permissions`)

### RLS Policies (migration 0032)

- All 5 tables: SELECT for tenant members with matching tenant_id; ALL write operations denied for frontend (`with check (false)`)
- Write access exclusively via SECURITY DEFINER RPCs

### RPCs Created (migration 0033)

| RPC | Signature |
|-----|-----------|
| `wh_create_grn_draft` | (p_tenant_id uuid, p_grn_number text, p_warehouse_bin_id uuid, p_lines jsonb, p_notes text) → jsonb |
| `wh_update_grn_draft` | (p_grn_id uuid, p_grn_number text, p_warehouse_bin_id uuid, p_lines jsonb, p_notes text) → jsonb |
| `wh_get_grn` | (p_grn_id uuid) → jsonb |
| `wh_list_grns` | (p_tenant_id uuid, p_status text default null) → jsonb |
| `wh_post_grn` | (p_grn_id uuid) → jsonb |

Helper function: `wh.current_user_has_grn_permission(p_tenant_id, p_required_permission_key)` — bypasses check when `auth.uid()` is NULL (service role).

All RPCs return `{ok: true/false, data: {...}, error: '...'}` JSONB envelopes.

## Key Decisions

- **FK targets physical tables** (`wh.products(id)`, `wh.units_of_measure(id)`, `wh.warehouse_bins(id)`) — confirmed by inspecting actual schema
- **`batch_id` nullable** with expression unique index `coalesce(batch_id, '00000000-...')` — avoids sentinel batch pattern
- **Audit columns nullable** — `created_by`, `posted_by`, `updated_by` have no FK because `auth.uid()` returns NULL for Management API calls
- **`text` status** with CHECK constraint instead of `wh.movement_type` enum (legacy from 0001, unused)
- **No auto GRN numbering** — caller provides `grn_number`, validated unique per tenant

## Files Created

| File | Description |
|------|-------------|
| `supabase/migrations/0030_grn_inventory_tables.sql` | 5 physical tables + DDL + legacy cleanup |
| `supabase/migrations/0031_grn_permissions_workspace.sql` | Permission keys + workspace activation |
| `supabase/migrations/0032_grn_inventory_rls.sql` | RLS policies for all 5 tables |
| `supabase/migrations/0033_grn_inventory_rpcs.sql` | 5 SECURITY DEFINER RPCs + permission helper |
| `tests/simulations/grn_inventory_receipt_flow.sql` | 12-test simulation, wraps in begin/rollback |
| `src/lib/grn-api.ts` | Minimal frontend RPC wrapper matching product-api.ts pattern |

## Files Modified

| File | Change |
|------|--------|
| `scripts/run-simulation.cjs` | Added GRN flow entry (11 simulations total) |

## Supabase Cloud Simulation Results

**HTTP 201 — All 12 tests passed.** Simulation wraps in `begin...rollback` so no test data persisted.

| # | Test | Result |
|---|------|--------|
| 1 | Create draft GRN | PASS |
| 2 | Update draft GRN | PASS |
| 3 | Post GRN | PASS |
| 4 | Verify GRN status = posted | PASS |
| 5 | Verify batch created (or existing reused) | PASS |
| 6 | Verify movement row with correct qty_delta | PASS |
| 7 | Verify current inventory incremented correctly | PASS |
| 8 | Verify rejected qty excluded | PASS |
| 9 | Verify duplicate posting blocked | PASS |
| 10 | Verify posted GRN update blocked | PASS |
| 11 | Verify batch reuse across multiple GRNs | PASS |
| 12 | Verify cumulative inventory (90 + 50 = 140) | PASS |

## Frontend API Wrapper

`src/lib/grn-api.ts` — exports 5 async functions wrapping RPC calls:
- `createGrnDraft(tenantId, grnNumber, warehouseBinId, lines, notes?)`
- `updateGrnDraft(grnId, grnNumber?, warehouseBinId?, lines?, notes?)`
- `getGrn(grnId)`
- `listGrns(tenantId, status?)`
- `postGrn(grnId)`

Types: `GrnHeader`, `GrnLine`, `GrnWithLines`, `GrnListResult`

## Verification Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 33 warnings (all pre-existing) |
| `npm run build` | Success |
| `npm run test` | 34 pass, 6 fail (all pre-existing auth/mock failures) |
| `npm run test:simulation` | 11 simulation files found (including GRN) |

## Known Gaps

- No GRN UI components yet (planned for Phase 4.2)
- No auto GRN numbering (caller-provided only)
- No `wh.movement_type` enum usage (using text CHECK constraint)
- No line-level approval workflow
- No partial-receipt support (single GRN → single posting)
- Writes bypass RLS via SECURITY DEFINER; anon-read verification requires separate anon-key client
