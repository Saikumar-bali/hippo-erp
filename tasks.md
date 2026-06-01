# Phase 4.5 Tasks: GRN Cancellation / Reversal Architecture

Active branch: `phase-2.5-metadata-engine`

Goal: Design the safe cancellation/reversal flow for posted GRNs. Do not implement Purchase Orders, transfers, adjustments, reservations, or valuation yet.

## Why This Phase Exists

Phase 4.1–4.4 created and hardened the GRN receiving flow:

- physical GRN and inventory tables
- GRN create/edit/post RPCs
- movement ledger and current inventory updates
- GRN UI
- read-only Current Inventory and Movement Ledger views
- production hardening for inventory list RPCs

But a real ERP must handle mistakes after posting. Posted inventory movements should not be deleted or edited. Cancellation should create controlled reversal movement rows and update current inventory in one database transaction.

This phase is architecture/planning first.

---

# A. Review And Docs

- [ ] Create `docs/PHASE_4_5_GRN_CANCELLATION_REVERSAL_ARCHITECTURE.md`
- [ ] Update `docs/METADATA_ENGINE.md` with transaction reversal boundary if needed
- [ ] Update `progress.md` after planning
- [ ] Create AI run report: `docs/ai-runs/2026-06-01_phase-4-5-grn-cancellation-reversal-architecture.md`

---

# B. Design Principles

Document these rules clearly:

- [ ] Posted GRN cannot be edited directly.
- [ ] Posted GRN cannot be deleted directly.
- [ ] Cancellation creates reversal inventory movement rows.
- [ ] Original movement rows remain unchanged.
- [ ] Current inventory is reduced by reversal quantities.
- [ ] Cancellation must be atomic.
- [ ] Cancellation must be blocked if inventory is already consumed below the quantity required for reversal.
- [ ] Cancellation requires explicit permission.
- [ ] Cancellation records who/when/why.

---

# C. Data Model Changes Proposal

Plan minimal additions to existing physical tables.

Possible GRN header additions:

- [ ] `cancelled_by uuid`
- [ ] `cancelled_at timestamptz`
- [ ] `cancel_reason text`
- [ ] `cancelled_from_status text` optional

Possible inventory movement fields:

- [ ] `reversal_of_movement_id uuid references wh.inventory_movements(id)`
- [ ] `is_reversal boolean default false`

Decide whether a separate audit table is needed:

- [ ] `wh.grn_status_events`

Do not overbuild if existing audit patterns are enough.

---

# D. RPC / Service Boundary Design

Plan explicit function:

- [ ] `wh_cancel_grn(p_grn_id uuid, p_reason text)`

Rules:

- [ ] Validate current user permission: `cancel_grn`.
- [ ] Validate GRN exists and belongs to user company.
- [ ] Validate GRN status is `posted`.
- [ ] Validate reason is required.
- [ ] Find original `GRN_RECEIPT` movement rows.
- [ ] For each movement, create `REVERSAL` movement with negative quantity.
- [ ] Decrease `wh.current_inventory` for matching product/batch/bin.
- [ ] Block cancellation if current on-hand quantity would become negative.
- [ ] Mark GRN status as `cancelled`.
- [ ] Store cancellation metadata.
- [ ] Ensure duplicate cancellation is blocked.
- [ ] Ensure everything happens in one transaction.

---

# E. Permission And Workspace Plan

Plan permission:

- [ ] `cancel_grn`

Decide grants:

- [ ] owner/admin: granted
- [ ] warehouse_manager: granted or optional
- [ ] stock_operator: likely not granted by default
- [ ] viewer/auditor: not granted

UI behavior:

- [ ] Show Cancel GRN button only for posted GRNs and permitted users.
- [ ] Ask for cancellation reason.
- [ ] Confirm irreversible reversal behavior.
- [ ] Show cancelled GRN as read-only.
- [ ] Movement Ledger should show REVERSAL rows clearly.

---

# F. Simulation Plan

Plan simulation:

- [ ] `tests/simulations/grn_cancellation_reversal_flow.sql`

Must verify:

- [ ] Create and post GRN.
- [ ] Confirm positive inventory movement exists.
- [ ] Confirm current inventory increased.
- [ ] Cancel GRN with reason.
- [ ] Confirm GRN status becomes cancelled.
- [ ] Confirm reversal movement row exists.
- [ ] Confirm current inventory reduced back.
- [ ] Confirm original movement remains unchanged.
- [ ] Confirm duplicate cancellation blocked.
- [ ] Confirm cancellation without reason blocked.
- [ ] Confirm cancellation blocked if stock already consumed below required quantity, if outbound consumption simulation is available.

---

# G. UI Plan

Plan only. Do not implement full UI unless explicitly approved after planning.

Future UI tasks:

- [ ] Add Cancel button to posted GRN detail.
- [ ] Add cancellation reason dialog.
- [ ] Add cancelled status badge.
- [ ] Add movement ledger type styling for REVERSAL rows.
- [ ] Add cancellation metadata to detail page.

---

# H. Test Suite / Verification Plan

Plan commands for implementation phase:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

The planning report must also carry forward current known test state from Phase 4.4.

---

# I. AI Run Report

Create:

- [ ] `docs/ai-runs/2026-06-01_phase-4-5-grn-cancellation-reversal-architecture.md`

Must include:

- [ ] files inspected
- [ ] architecture decisions
- [ ] proposed table changes
- [ ] proposed RPC design
- [ ] permission design
- [ ] simulation plan
- [ ] UI plan
- [ ] risks and edge cases
- [ ] next implementation recommendation

---

# J. Out Of Scope

Do not implement in this phase:

- [ ] full cancellation RPC implementation
- [ ] full cancellation UI
- [ ] Purchase Orders
- [ ] supplier invoices/payments
- [ ] transfers
- [ ] adjustments
- [ ] cycle counts
- [ ] reservations
- [ ] valuation/FIFO/weighted average
- [ ] full workflow engine
- [ ] full naming series engine

---

# K. Acceptance Criteria

Phase 4.5 planning is complete only when:

- [ ] cancellation/reversal architecture doc exists
- [ ] reversal movement strategy is clear
- [ ] current inventory update strategy is clear
- [ ] duplicate cancellation and insufficient-stock cases are addressed
- [ ] permission design is clear
- [ ] simulation plan exists
- [ ] UI plan exists
- [ ] AI run report exists

After Phase 4.5 planning, proceed to Phase 4.6: implement GRN cancellation/reversal backend.
