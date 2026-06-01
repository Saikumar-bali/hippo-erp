# AI Run: Phase 4.5 — GRN Cancellation / Reversal Architecture

**Date:** 2026-06-01
**Branch:** phase-2.5-metadata-engine
**Type:** Architecture / Planning (no implementation)

---

## Summary

Phase 4.5 is a pure architecture and planning phase for GRN cancellation and reversal. No code was implemented. The deliverable is a comprehensive design document that covers reversal rules, table changes, RPC design, permission design, simulation plan, UI plan, risks, and edge cases.

---

## Deliverables Created

| File | Purpose |
|------|---------|
| `docs/PHASE_4_5_GRN_CANCELLATION_REVERSAL_ARCHITECTURE.md` | Full architecture document |
| `docs/ai-runs/2026-06-01_phase-4-5-grn-cancellation-reversal-architecture.md` | This report |

---

## Architecture Decisions

### Decision 1: Two-pass RPC design (validate → execute)

Validation pass checks all stock constraints before any writes. Execution pass performs the reversals. This prevents partial cancellations when a single line fails.

### Decision 2: `cancel_grn` permission key (not `cancel_document`)

A dedicated `cancel_grn` key over the generic `cancel_document` for granular audit and UI clarity. Granted to owner, admin, warehouse_manager by default.

### Decision 3: `reversal_of_movement_id` column

Links reversal movements directly to original `GRN_RECEIPT` movements for UI traceability and analytics, in addition to the existing `source_type` / `source_id` / `source_line_id` link back to the GRN.

### Decision 4: Block full cancellation on stock insufficiency

If any line has `on_hand_qty < accepted_qty`, the entire cancellation is rejected. Partial cancellation is out of scope.

### Decision 5: `grn_status_events` table deferred

The existing audit columns (`posted_by`, `posted_at`, `cancelled_by`, `cancelled_at`) cover the `draft → posted → cancelled` lifecycle. A dedicated status events table is unnecessary until multi-step workflows are planned.

### Decision 6: Batch deactivation (not deletion)

Batches created by the cancelled GRN are soft-deactivated (`is_active = false`). The batch record remains for audit. Shared batches are not affected.

---

## What Was Leveraged

| Existing Asset | How Used |
|----------------|----------|
| `REVERSAL` in `movement_type` CHECK | Defined but unused — will be the movement type for reversal rows |
| `cancelled` in `status` CHECK | Defined but never assigned by any RPC — will be set by `wh_cancel_grn` |
| `wh.current_user_has_grn_permission()` | Reused for `cancel_grn` permission check |
| Append-only `inventory_movements` pattern | Reversal inserts new rows, never touches originals |
| `wh.current_inventory` upsert pattern | Decrement on_hand/available_qty mirrors the increment in `wh_post_grn` |

---

## Phase 4.6 Implementation Plan

| Step | Detail |
|------|--------|
| 1 | Create and apply migration `0038_grn_cancellation_reversal.sql` |
| 2 | Build `CancelGrnDialog.tsx` + wire into `GrnDetailPage.tsx` |
| 3 | Update `GrnStatusBadge.tsx` for `cancelled` status |
| 4 | Add `cancelGrn()` to `src/lib/grn-api.ts` |
| 5 | Create simulation: `tests/simulations/grn_cancellation_reversal_flow.sql` |
| 6 | Run verification (typecheck, lint, test, Supabase Cloud) |
| 7 | Browser verify full flow |
| 8 | Create AI run report |
