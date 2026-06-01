# Phase 4.6 Tasks: Implement GRN Cancellation / Reversal

Active branch: `phase-2.5-metadata-engine`

Goal: Implement safe cancellation for posted GRNs using reversal inventory movements. Do not start Purchase Orders, transfers, adjustments, reservations, valuation, or workflow yet.

## Why This Phase Exists

Phase 4.5 completed the cancellation/reversal architecture. Now implement the backend and minimal UI.

A posted GRN must never be edited or deleted to correct mistakes. Cancellation must:

- create reversal inventory movement rows
- leave original movement rows unchanged
- decrement current inventory transactionally
- block cancellation if stock was already consumed
- require a reason and permission
- make cancelled GRNs read-only

---

# A. Review And Docs

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-phase-4-5-cancellation-architecture.md`
- [ ] Update `progress.md` after implementation
- [ ] Create AI run report: `docs/ai-runs/2026-06-01_phase-4-6-grn-cancellation-reversal.md`

---

# B. Migration: Cancellation / Reversal

Create migration:

- [ ] `supabase/migrations/0038_grn_cancellation_reversal.sql`

Migration must include:

## B1. Table changes

Add to `wh.grns`:

- [ ] `cancelled_by uuid null`
- [ ] `cancelled_at timestamptz null`
- [ ] `cancel_reason text null`

Add to `wh.inventory_movements`:

- [ ] `is_reversal boolean not null default false`
- [ ] `reversal_of_movement_id uuid null references wh.inventory_movements(id)`

Do not delete or mutate existing movement rows.

## B2. Permission

Seed permission:

- [ ] `cancel_grn`

Grant default access to:

- [ ] owner
- [ ] admin
- [ ] warehouse_manager, if this role exists

Do not grant by default to:

- [ ] stock_operator
- [ ] viewer
- [ ] auditor

## B3. RPC

Implement:

- [ ] `wh_cancel_grn(p_grn_id uuid, p_reason text)`

Requirements:

- [ ] SECURITY DEFINER
- [ ] validate GRN exists
- [ ] validate status is `posted`
- [ ] validate reason is not empty
- [ ] validate user has `cancel_grn`
- [ ] lock `wh.grns` row with `FOR UPDATE`
- [ ] lock relevant `wh.current_inventory` rows with `FOR UPDATE`
- [ ] find original `GRN_RECEIPT` movements for each accepted line
- [ ] handle missing original movement as error
- [ ] handle duplicate original movement as error or deterministic safe behavior
- [ ] ensure `on_hand_qty >= accepted_qty` and `available_qty >= accepted_qty`
- [ ] insert `REVERSAL` movement rows with negative qty
- [ ] set `is_reversal = true`
- [ ] set `reversal_of_movement_id` to original movement id
- [ ] decrement `current_inventory.on_hand_qty` and `available_qty`
- [ ] update `last_movement_at`
- [ ] deactivate batches created solely by this GRN
- [ ] update GRN status to `cancelled`
- [ ] set `cancelled_by`, `cancelled_at`, `cancel_reason`
- [ ] block duplicate cancellation
- [ ] return `{ ok: true, data: { grn_id, reversals_created } }`
- [ ] return friendly structured errors

---

# C. API Wrapper

Update:

- [ ] `src/lib/grn-api.ts`

Add:

- [ ] `cancelGrn(grnId: string, reason: string)`

Ensure:

- [ ] returns typed result
- [ ] surfaces friendly backend errors
- [ ] does not use generic JSON CRUD

---

# D. UI: Minimal Cancellation

Create:

- [ ] `src/components/grn/CancelGrnDialog.tsx`

Update:

- [ ] `src/components/grn/GrnDetailPage.tsx`
- [ ] `src/components/grn/GrnStatusBadge.tsx`
- [ ] `src/components/grn/InventoryMovementsPage.tsx` if needed

UI requirements:

- [ ] Show Cancel GRN button only for posted GRNs.
- [ ] Ask for reason in dialog.
- [ ] Reason is required.
- [ ] Warn that cancellation creates reversal inventory entries.
- [ ] Disable button while cancelling.
- [ ] After successful cancellation, reload detail.
- [ ] Show cancelled status badge.
- [ ] Cancelled GRN remains read-only.
- [ ] Movement ledger clearly shows `REVERSAL` rows.

Permission note:

- If frontend permission helper is readily available in this component tree, hide Cancel button unless user has `cancel_grn`.
- If not practical in this phase, rely on backend permission and document the UI limitation.

---

# E. Simulation Test

Create:

- [ ] `tests/simulations/grn_cancellation_reversal_flow.sql`

Update:

- [ ] `scripts/run-simulation.cjs`

Simulation must verify:

- [ ] create and post GRN
- [ ] positive movement exists
- [ ] current inventory increased
- [ ] cancel GRN with reason
- [ ] GRN status becomes cancelled
- [ ] reversal movement exists with negative qty
- [ ] reversal links to original movement
- [ ] original movement remains unchanged
- [ ] current inventory reduced back
- [ ] duplicate cancellation blocked
- [ ] cancellation without reason blocked
- [ ] cancellation of draft blocked
- [ ] insufficient stock blocks cancellation if practical
- [ ] cleanup/rollback at end

---

# F. Browser Verification

Verify against Supabase Cloud:

- [ ] open posted GRN detail
- [ ] Cancel GRN button appears for permitted user
- [ ] cancel without reason is blocked
- [ ] cancel with reason succeeds
- [ ] GRN status becomes cancelled
- [ ] cancelled GRN is read-only
- [ ] Current Inventory decreases
- [ ] Movement Ledger shows REVERSAL row
- [ ] duplicate cancellation is blocked or impossible from UI

Screenshots should be committed if practical under:

```text
docs/ai-runs/screenshots/phase-4-6-grn-cancellation/
```

If screenshots are local-only, say so clearly.

---

# G. Tests And Commands

Run and document exact output:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Document known pre-existing test failures separately from new failures.

---

# H. AI Run Report

Create:

- [ ] `docs/ai-runs/2026-06-01_phase-4-6-grn-cancellation-reversal.md`

Must include:

- [ ] final commit hash
- [ ] files created/modified
- [ ] migration details
- [ ] RPC implementation summary
- [ ] simulation result
- [ ] browser verification result
- [ ] screenshot paths or local-only note
- [ ] command results
- [ ] known gaps
- [ ] next recommended task

---

# I. Out Of Scope

Do not implement in this phase:

- [ ] Purchase Orders
- [ ] supplier invoices/payments
- [ ] transfers
- [ ] adjustments
- [ ] cycle counts
- [ ] reservations
- [ ] valuation/FIFO/weighted average
- [ ] full workflow engine
- [ ] full naming series engine
- [ ] partial GRN cancellation

---

# J. Acceptance Criteria

Phase 4.6 is complete only when:

- [ ] `wh_cancel_grn` exists and passes simulation
- [ ] cancellation creates reversal movement rows
- [ ] original movements remain unchanged
- [ ] current inventory decreases safely
- [ ] duplicate/draft/no-reason cancellation is blocked
- [ ] insufficient-stock case is handled or documented
- [ ] minimal UI allows cancellation with reason
- [ ] cancelled status renders correctly
- [ ] browser verification is documented
- [ ] AI run report exists

After Phase 4.6, decide whether to proceed to Phase 4.7 GRN numbering/QC polish or Phase 5 Purchase Orders.
