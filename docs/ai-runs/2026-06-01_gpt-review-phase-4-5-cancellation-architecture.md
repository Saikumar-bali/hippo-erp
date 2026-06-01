# GPT Review Report: Phase 4.5 GRN Cancellation / Reversal Architecture

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commit

- `afe6bb3` — Phase 4.5 GRN cancellation reversal architecture: design doc, AI run report, progress update

## Files Reviewed

- `docs/PHASE_4_5_GRN_CANCELLATION_REVERSAL_ARCHITECTURE.md`
- `docs/ai-runs/2026-06-01_phase-4-5-grn-cancellation-reversal-architecture.md`
- `progress.md`
- `tasks.md`

## Review Result

Phase 4.5 planning is accepted.

The architecture correctly protects the inventory ledger:

- Posted GRNs are not edited directly.
- Original `GRN_RECEIPT` movement rows remain unchanged.
- Cancellation creates `REVERSAL` movement rows with negative quantities.
- Current inventory is reduced in the same transaction.
- Duplicate cancellation is blocked.
- Cancellation requires a reason.
- Cancellation is blocked if current stock is insufficient to reverse the received quantity.

This is the right ERP pattern. Do not mutate historical ledger rows.

## What Is Good

### Reversal strategy

The plan uses `movement_type = 'REVERSAL'`, `is_reversal = true`, and `reversal_of_movement_id` to link the reversal row directly to the original movement.

### Permission strategy

The plan creates a specific `cancel_grn` permission instead of using broad `cancel_document`. That is better for audit and role control.

### Stock safety

The plan checks `current_inventory.on_hand_qty >= accepted_qty` before reversal. That prevents negative inventory if stock from the GRN has already been consumed.

### Batch handling

Batches created by the cancelled GRN are soft-deactivated, not deleted. Shared/reused batches are not deactivated.

## Implementation Cautions

### 1. Lock current inventory rows

The architecture notes that `current_inventory` rows should be locked with `FOR UPDATE`. Phase 4.6 implementation must do this. Locking only the GRN row is not enough if another inventory operation changes the same product/batch/bin while cancellation is running.

### 2. Find original movement rows carefully

Do not assume one movement per line without enforcing it. The implementation should find the original `GRN_RECEIPT` movement for each `grn_line.id` and handle missing/duplicate movement rows safely.

### 3. Use current physical schema names

Continue using the actual physical Phase 4 schema (`wh.grns`, `wh.grn_lines`, `wh.inventory_movements`, `wh.current_inventory`, `wh.inventory_batches`). Do not use generic JSON storage for this feature.

### 4. Simulation must prove failure cases

The implementation phase must verify:

- cancelling posted GRN works
- duplicate cancellation blocked
- draft cancellation blocked
- empty reason blocked
- original movement unchanged
- reversal movement linked to original
- current inventory decremented
- insufficient stock blocks cancellation

## Decision

Proceed to Phase 4.6: Implement GRN Cancellation / Reversal Backend + Minimal UI.

Do not start Purchase Orders, stock transfers, adjustments, reservations, valuation, or workflow yet.
