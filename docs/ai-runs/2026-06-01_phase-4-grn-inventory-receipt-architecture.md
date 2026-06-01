# AI Run Report: Phase 4 — GRN + Inventory Receipt Architecture

**Date:** 2026-06-01
**Goal:** Plan the GRN/inventory receipt architecture — physical tables, RPC/service boundary, validations, simulation plan — before implementing any quantity-changing ERP logic.

**Status:** Planning only. No implementation code written.

## Branch
`phase-2.5-metadata-engine`

## Commits to Build On
- `dff76cb` — docs: update AI run report (Phase 3.1 completion)
- `df5c2d6` — Polish Workspace Items grouped UI

## Files Created (1)
| File | Purpose |
|------|---------|
| `docs/PHASE_4_GRN_INVENTORY_RECEIPT_ARCHITECTURE.md` | Full architecture document: table DDL, RPC signatures, validations, permissions, UI strategy, simulation plan, browser verification plan |

## Files Modified (2)
| File | Change |
|------|--------|
| `docs/METADATA_ENGINE.md` | Added "Phase 4: GRN + Inventory Receipt (Design)" section documenting the master-data vs transactional boundary, tables, RPCs, and key rules |
| `progress.md` | Updated Phase 4 row from "Pending" to "Planning complete" with architecture doc reference; added Phase 4 planning summary section |

## Test Triage
| Test File | Tests Failed | Classification |
|-----------|-------------|---------------|
| `auth-state.spec.tsx` | 1 | **Pre-existing** — mock `signInWithPassword` doesn't set error state |
| `auth-routes.spec.tsx` | 1 | **Pre-existing** — mock doesn't simulate async session fetch |
| `users-roles.spec.tsx` | 2 | **Pre-existing** — mock `supabaseAdmin` data shape mismatch |
| `dashboard-kpi.spec.tsx` | 1 | **Pre-existing** — mock KPI data doesn't match component expectations |
| `permission-gates.spec.tsx` | 1 | **Pre-existing** — mock permission store values don't match gate components |

**Total: 6 failed tests across 5 files. All pre-existing.** None caused by metadata/warehouse/GRN work. Fix deferred to a dedicated auth-test cleanup phase.

## Architecture Decisions

### Master Data vs Transaction Boundary
- Products, UOM, Categories, Warehouse hierarchy → `app.erp_documents` (generic_json) via `erp_create_document` etc.
- **GRN, inventory movements, batches, current inventory** → `wh.*` physical tables via explicit SECURITY DEFINER RPCs only

### Five Physical Tables

| Table | Purpose | Key Constraints |
|-------|---------|-----------------|
| `wh.grns` | GRN header | company-scoped, status check (draft/posted/cancelled), unique grn_number per company |
| `wh.grn_lines` | Line items | received_qty > 0, accepted_qty + rejected_qty <= received_qty, FK to warehouse levels |
| `wh.inventory_batches` | Batch tracking | unique per company/product/batch_number, FK to GRN source |
| `wh.inventory_movements` | Append-only ledger | movement_type + qty_delta, FK to GRN source, immutable |
| `wh.current_inventory` | Quantity snapshot | unique per product/batch/bin, on_hand/available_qty >= 0 |

### Five RPCs

| RPC | Type | Description |
|-----|------|-------------|
| `wh_create_grn_draft` | Mutable | Create GRN header + lines |
| `wh_update_grn_draft` | Mutable | Update draft GRN |
| `wh_get_grn` | Read-only | Get GRN with lines |
| `wh_list_grns` | Read-only | List GRNs with filters |
| `wh_post_grn` | **Atomic** | Validate → create batches → create movements → upsert current inventory in one transaction |

### Posting Guarantees
- Validates GRN is in `draft` status
- Validates each line: qty constraints, batch/expiry rules from product metadata, bin allocation for accepted_qty
- All mutations happen in a single PostgreSQL transaction
- Posted GRN is permanently read-only; cancellation creates reversal movements

### Permission Model
Permission keys: `create_grn`, `post_grn`, `view_grn`, `delete_grn`, `cancel_grn` (future)

## Code Quality
| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 33 warnings |
| `npm run test` | 34 pass, 6 fail (all pre-existing) |
| `npm run build` | To be verified after implementation |

## Next Steps (Phase 4 Implementation)
1. Create migration `0030_grn_inventory_tables.sql` — create `wh.*` schema, all 5 tables, indexes
2. Create migration `0031_grn_rpcs.sql` — implement 5 SECURITY DEFINER functions
3. Create migration `0032_grn_rls.sql` — RLS policies for wh.* tables
4. Build GRN UI components: `GRNListPage`, `GRNFormPage`, `GRNDetailPage`
5. Create `tests/simulations/grn_inventory_receipt_flow.sql`
6. Browser verification per plan in architecture doc
7. Update progress.md after implementation
8. Push and create GitHub release
