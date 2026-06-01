# AI Run: Phase 4.6 — GRN Cancellation / Reversal Implementation

**Date:** 2026-06-01
**Branch:** phase-2.5-metadata-engine
**Final Commit:** *(not yet committed)*

---

## Summary

Phase 4.6 implements the GRN cancellation/reversal feature planned in Phase 4.5. Includes migration, RPC, frontend dialog, API wrapper, simulation, and Supabase Cloud verification.

---

## Deliverables Created

| File | Purpose |
|------|---------|
| `supabase/migrations/0038_grn_cancellation_reversal.sql` | Migration: columns, permission, `wh_cancel_grn` RPC |
| `src/lib/grn-api.ts` | Added `cancelGrn()` wrapper (modified) |
| `src/components/grn/CancelGrnDialog.tsx` | New — cancellation reason dialog with confirmation |
| `src/components/grn/GrnDetailPage.tsx` | Added Cancel button + cancelled info display (modified) |
| `src/components/grn/InventoryMovementsPage.tsx` | REVERSAL rows styled with red bg + bold label (modified) |
| `tests/simulations/grn_cancellation_reversal_flow.sql` | 12-test simulation (rolls back) |
| `scripts/run-simulation.cjs` | Added cancellation flow entry (modified) |
| `docs/ai-runs/2026-06-01_phase-4-6-grn-cancellation-reversal.md` | This report |

## Migration Summary

### Table Changes

**`wh.grns`** — added columns:
- `cancelled_by uuid`
- `cancelled_at timestamptz`
- `cancel_reason text`

**`wh.inventory_movements`** — added columns:
- `is_reversal boolean NOT NULL DEFAULT false`
- `reversal_of_movement_id uuid REFERENCES wh.inventory_movements(id)`
- Index: `idx_inventory_movements_reversal` on `(reversal_of_movement_id)`

### Permission

- `cancel_grn` key seeded in `app.permissions` (module: grn, sort_order: 26)
- Granted to `owner`, `admin`, `warehouse_manager` via system grants + company role sync

### RPC `wh_cancel_grn(p_grn_id uuid, p_reason text)`

| Guard | Behavior |
|-------|----------|
| GRN exists | `SELECT ... FOR UPDATE` row lock |
| Status `posted` | Error if not posted |
| Reason required | Error if null/empty |
| Permission `cancel_grn` | Uses `wh.current_user_has_grn_permission()` |
| Duplicate cancellation | Blocked by status != 'posted' guard |
| Stock consumption guard | Locks `current_inventory` rows, checks `on_hand_qty >= accepted_qty` per line |
| Original movement exists | Errors if `GRN_RECEIPT` movement not found for any accepted line |

**Algorithm:** Two-pass:
1. PASS 1: Validate all lines — find original movements, lock inventory rows, check stock
2. PASS 2: Execute reversals — insert `REVERSAL` movements (negative qty, `is_reversal=true`, `reversal_of_movement_id` set), decrement `current_inventory`, deactivate GRN-created batches, update GRN status to `cancelled`

---

## RPC Implementation Details

- `SECURITY DEFINER`, `SET search_path = ''`
- Uses `coalesce(..., v_original_movement.batch_id)` since `wh.grn_lines` stores `batch_number` (text), not `batch_id` (uuid)
- Exception block returns `{ok: false, error: sqlerrm}`
- Returns `{ok: true, data: {grn_id, reversals_created}}` on success
- Batch deactivation: `UPDATE wh.inventory_batches SET is_active = false WHERE created_from = 'GRN' AND created_from_id = p_grn_id`

## Frontend Implementation

### CancelGrnDialog.tsx
- Modal overlay with textarea for reason
- Warning: "This action cannot be undone"
- Validates reason is non-empty
- Calls `cancelGrn(grnId, reason)` from `grn-api.ts`
- On success: calls `onCancelled()` callback which reloads the detail page

### GrnDetailPage.tsx
- Cancel button shown only when `status === 'posted'`
- Cancelled info section (cancelled_at, cancel_reason) shown when GRN is cancelled
- Handles reload after cancellation

### InventoryMovementsPage.tsx
- REVERSAL rows: red background (`#fef2f2`), italic, red bold REVERSAL label
- Original GRN_RECEIPT rows unchanged

---

## Simulation (12 tests)

| # | Scenario | Result |
|---|----------|--------|
| 1 | Create and post GRN | PASS |
| 2 | Positive GRN_RECEIPT movement exists | PASS |
| 3 | Current inventory increased | PASS |
| 4 | Cancel GRN with reason | PASS |
| 5 | GRN status = cancelled, reason stored | PASS |
| 6 | Reversal movement with negative qty | PASS |
| 7 | Reversal links to original movement | PASS |
| 8 | Original movement remains unchanged | PASS |
| 9 | Current inventory reduced back | PASS |
| 10 | Duplicate cancellation blocked | PASS |
| 11 | Cancellation without reason blocked | PASS |
| 12 | Cancellation of draft blocked | PASS |

---

## Supabase Cloud Verification

| Check | Result |
|-------|--------|
| Migration 0038 applied | Applied |
| `wh.grns` columns exist | `cancelled_by`, `cancelled_at`, `cancel_reason` |
| `wh.inventory_movements` columns exist | `is_reversal`, `reversal_of_movement_id` |
| `cancel_grn` permission seeded | Active, granted to owner/admin/warehouse_manager |
| Post GRN + cancel E2E | CRE→POSTED→CANCELLED, movements verified |
| Original movement unchanged | `qty_delta=15` retained |
| Reversal movement | `qty_delta=-15`, `is_reversal=true`, links to original |
| Current inventory | Reduced from 15 to 0 |

---

## Command Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 37 warnings (pre-existing) |
| `npm run build` | Success |

---

## Known Gaps

- No PO reference in GRN (planned for future phase)
- No line-level approval or partial-receipt workflow
- No partial cancellation support (blocked entirely if any line has insufficient stock)
- `wh.grn_status_events` audit table deferred (existing columns sufficient for draft→posted→cancelled)
- Browser verification screenshots not captured (requires authenticated user session)
- Insufficient-stock-with-consumption simulation not executed (requires outbound movement, out of scope)
