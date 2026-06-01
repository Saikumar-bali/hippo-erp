# Phase 4 Tasks: GRN + Inventory Receipt Architecture

Active branch: `phase-2.5-metadata-engine`

Goal: Plan the Goods Receipt Note (GRN) flow and the inventory quantity update architecture before implementing any quantity-changing ERP logic.

## Why This Phase Exists

The framework foundation is now ready:

- Metadata-driven workspace/sidebar
- Metadata Studio and Custom DocType Wizard
- Generic JSON storage for safe master data
- Product Master
- Warehouse hierarchy master data
- Metadata Studio UX polish

GRN is the first serious inventory transaction. It must not be implemented as normal generic JSON CRUD. It needs explicit database functions/services because it creates receipt lines, batches, bin allocations, movement records, and current quantity updates.

---

# A. Planning And Docs

Create/update:

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-phase-3-1-metadata-ui.md`
- [ ] `docs/PHASE_4_GRN_INVENTORY_RECEIPT_ARCHITECTURE.md`
- [ ] `docs/METADATA_ENGINE.md`
- [ ] `progress.md`

Document:

- [ ] GRN business flow
- [ ] Master data vs transaction data boundary
- [ ] Why generic JSON is not used for inventory quantity changes
- [ ] Supabase Cloud verification flow
- [ ] Required simulation and browser verification plan

---

# B. Phase 4 Scope

Plan these items:

- [ ] GRN header
- [ ] GRN lines
- [ ] QC / grading fields
- [ ] Batch creation rules
- [ ] Bin allocation rules
- [ ] Inventory movement record design
- [ ] Current quantity snapshot design
- [ ] Explicit database function boundary
- [ ] Permission and status boundary

Do not implement yet:

- [ ] Purchase Orders
- [ ] Supplier invoices
- [ ] Payments
- [ ] Transfers
- [ ] Adjustments
- [ ] Cycle counts
- [ ] Reservations
- [ ] Valuation/FIFO/weighted average
- [ ] Full workflow engine

---

# C. Data Model Proposal

Design physical transaction tables, not generic JSON:

- [ ] `wh.grns`
- [ ] `wh.grn_lines`
- [ ] `wh.inventory_batches`
- [ ] `wh.inventory_movements`
- [ ] `wh.current_inventory`

Rules:

- [ ] Draft GRN can be edited.
- [ ] Posted GRN becomes read-only except controlled cancellation/reversal later.
- [ ] Posting creates inventory movement rows.
- [ ] Movement rows should not be directly edited by the UI.
- [ ] Current inventory is updated in the same database transaction.

---

# D. Suggested GRN Header Fields

- [ ] `id uuid`
- [ ] `company_id uuid`
- [ ] `grn_number text`
- [ ] `supplier_name text` or `supplier_id uuid`
- [ ] `received_date date`
- [ ] `status text` draft/posted/cancelled
- [ ] `qc_status text` pending/accepted/rejected/partial
- [ ] `notes text`
- [ ] `created_by uuid`
- [ ] `updated_by uuid`
- [ ] `posted_by uuid`
- [ ] `posted_at timestamptz`
- [ ] timestamps

---

# E. Suggested GRN Line Fields

- [ ] `id uuid`
- [ ] `grn_id uuid`
- [ ] `product_id uuid`
- [ ] `uom_id uuid`
- [ ] `received_qty numeric`
- [ ] `accepted_qty numeric`
- [ ] `rejected_qty numeric`
- [ ] `batch_number text`
- [ ] `expiry_date date`
- [ ] `warehouse_id uuid`
- [ ] `zone_id uuid`
- [ ] `aisle_id uuid`
- [ ] `rack_id uuid`
- [ ] `shelf_id uuid`
- [ ] `bin_id uuid`
- [ ] `line_status text`

Validation:

- [ ] `received_qty > 0`
- [ ] `accepted_qty + rejected_qty <= received_qty`
- [ ] batch number required or generated when product uses batch tracking
- [ ] expiry date required when product uses expiry tracking
- [ ] bin allocation required for accepted quantity

---

# F. Inventory Movement Design

Design movement fields:

- [ ] `id uuid`
- [ ] `company_id uuid`
- [ ] `movement_type text` e.g. `GRN_RECEIPT`
- [ ] `source_type text` = `GRN`
- [ ] `source_id uuid`
- [ ] `source_line_id uuid`
- [ ] `product_id uuid`
- [ ] `batch_id uuid`
- [ ] `warehouse_id uuid`
- [ ] `bin_id uuid`
- [ ] `qty_delta numeric`
- [ ] `movement_date timestamptz`
- [ ] `created_by uuid`

Rules:

- [ ] Accepted quantity creates positive movement.
- [ ] Rejected quantity does not increase available inventory.
- [ ] Movement rows should not be edited directly.
- [ ] Cancellation later should create reversal movement, not mutate old movement.

---

# G. Current Inventory Snapshot

Design `wh.current_inventory` strategy:

- [ ] one row per company/product/batch/bin combination
- [ ] updated inside same posting transaction
- [ ] available quantity initially equals on-hand quantity until reservations exist
- [ ] outbound transactions later must not make quantity negative

---

# H. RPC / Service Boundary

Plan explicit functions:

- [ ] `wh_create_grn_draft`
- [ ] `wh_update_grn_draft`
- [ ] `wh_get_grn`
- [ ] `wh_list_grns`
- [ ] `wh_post_grn`
- [ ] `wh_cancel_grn` future/optional

Rules:

- [ ] validate permission
- [ ] validate company context
- [ ] validate product/UOM/warehouse/bin existence
- [ ] validate quantities
- [ ] create batch if needed
- [ ] create movement records
- [ ] update current inventory
- [ ] set GRN status to posted
- [ ] all posting work happens inside one database transaction

---

# I. UI Strategy

GRN can appear in workspace/sidebar through metadata:

```text
Purchasing
  GRN
```

But GRN operations must use explicit GRN APIs, not generic JSON.

Plan UI:

- [ ] GRN list
- [ ] GRN create/edit draft form
- [ ] line item grid
- [ ] product link field
- [ ] warehouse hierarchy link fields
- [ ] accepted/rejected quantity inputs
- [ ] Post button
- [ ] posted read-only view

---

# J. Simulation Plan

Plan simulation file:

- [ ] `tests/simulations/grn_inventory_receipt_flow.sql`

It should verify:

- [ ] create draft GRN
- [ ] add line
- [ ] post GRN
- [ ] batch created if needed
- [ ] movement row created
- [ ] current inventory increased
- [ ] cannot casually edit posted GRN
- [ ] rejected quantity does not increase available inventory
- [ ] duplicate posting blocked
- [ ] cleanup at end

---

# K. Browser Verification Plan

Plan UI verification:

- [ ] create GRN draft
- [ ] add product line
- [ ] select warehouse/bin
- [ ] enter accepted/rejected quantities
- [ ] save draft
- [ ] post GRN
- [ ] confirm posted status
- [ ] confirm current inventory increased
- [ ] confirm movement record exists

---

# L. Test Suite Triage

Latest Phase 3.1 report says:

- [ ] `npm run typecheck`: passing
- [ ] `npm run lint`: passing with warnings
- [ ] `npm run build`: passing
- [ ] `npm run test`: 32 pass, 8 fail

Tasks:

- [ ] identify the 8 failing tests
- [ ] classify pre-existing vs newly introduced
- [ ] fix any failures caused by recent metadata/warehouse work
- [ ] document remaining pre-existing failures

---

# M. AI Run Report

Create:

- [ ] `docs/ai-runs/2026-06-01_phase-4-grn-inventory-receipt-architecture.md`

Must include:

- [ ] files inspected
- [ ] architecture decisions
- [ ] data model proposal
- [ ] API/RPC proposal
- [ ] security/RLS proposal
- [ ] inventory transaction design
- [ ] simulation plan
- [ ] test triage results
- [ ] next implementation recommendation

---

# N. Acceptance Criteria

Phase 4 planning is complete when:

- [ ] GRN architecture doc exists
- [ ] table design is clear
- [ ] RPC/service boundary is clear
- [ ] generic JSON boundary is clearly forbidden for inventory quantity changes
- [ ] simulation plan exists
- [ ] browser verification plan exists
- [ ] test failures are triaged
- [ ] AI run report exists

Only after this planning phase should CLI-AI implement GRN tables/RPCs/UI.
