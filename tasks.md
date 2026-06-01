# Phase 4.3 Tasks: GRN UI Hardening And Inventory Read-Only Views

Active branch: `phase-2.5-metadata-engine`

Goal: Harden the Phase 4.2 GRN UI against real Supabase Cloud usage, fix readable labels in posted detail, and add read-only inventory visibility. Do not add new inventory transaction types yet.

## Why This Phase Exists

Phase 4.2 created the first GRN UI foundation. It is accepted as a first pass, but the review found gaps:

- browser verification was local-only and not fully authenticated against Supabase Cloud
- posted GRN detail may show raw UUIDs for Product/UOM/Bin labels
- duplicate-post protection is mostly hidden by UI state and not clearly surfaced
- current inventory and inventory movements are not visible in UI
- the AI report still has `Final Commit: (to be determined)`

Phase 4.3 should make GRN usable and inspectable for real ERP operations.

---

# A. Review And Docs

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-phase-4-2-grn-ui.md`
- [ ] Create `docs/PHASE_4_3_GRN_UI_HARDENING.md`
- [ ] Update `docs/PHASE_4_2_GRN_UI_FOUNDATION.md` if details changed
- [ ] Update `docs/METADATA_ENGINE.md` if routing/transaction UI boundary changed
- [ ] Update `progress.md`
- [ ] Update `docs/ai-runs/2026-06-01_phase-4-2-grn-ui-foundation.md` with actual final commit hash
- [ ] Create `docs/ai-runs/2026-06-01_phase-4-3-grn-ui-hardening.md`

---

# B. Authenticated Browser Verification

Use a real authenticated app session against Supabase Cloud.

Verify and document:

- [ ] user can open Purchasing → GRN
- [ ] user can create a draft GRN
- [ ] user can add at least one line
- [ ] product, UOM, and bin dropdowns load real records
- [ ] user can save draft
- [ ] draft appears in list
- [ ] user can reopen draft
- [ ] user can post GRN
- [ ] status becomes posted
- [ ] posted GRN detail is read-only
- [ ] duplicate post is blocked or impossible and backend error is shown clearly when forced
- [ ] current inventory increased
- [ ] inventory movement row exists

Screenshots should be committed if practical under:

```text
docs/ai-runs/screenshots/phase-4-3-grn-hardening/
```

If screenshots are local-only, say so clearly.

---

# C. Posted GRN Detail Label Fix

Current `GrnDetailPage` passes empty arrays to `GrnLineGrid`, so read-only detail may show raw UUIDs.

Fix one of these ways:

Option A — Frontend enrichment:

- [ ] load products via `listProducts(tenantId)`
- [ ] load UOMs via `listUoms(tenantId)`
- [ ] load bins from `wh.warehouse_bins`
- [ ] pass those arrays into `GrnLineGrid`

Option B — Backend enrichment:

- [ ] update `wh_get_grn` to return display labels
- [ ] update `grn-api.ts` types
- [ ] render labels from API

Preferred first step: Option A unless backend changes are clearly cleaner.

Acceptance:

- [ ] Posted detail shows product SKU/name, UOM code, and bin code/name
- [ ] No raw UUIDs in normal read-only detail view

---

# D. Duplicate Post UX

Improve post safety:

- [ ] Add confirmation dialog before posting a draft
- [ ] Disable Post button while posting
- [ ] If backend says already posted, show friendly message
- [ ] If user opens a posted GRN in edit route, redirect to read-only detail or show read-only state
- [ ] Document duplicate-post browser/API result

---

# E. Read-Only Current Inventory View

Add read-only current inventory page if backend allows SELECT.

Suggested file:

- [ ] `src/components/grn/CurrentInventoryPage.tsx`

Display columns:

- [ ] Product
- [ ] Batch
- [ ] Bin
- [ ] On Hand Qty
- [ ] Available Qty
- [ ] Last Movement At

Rules:

- [ ] read-only only
- [ ] no create/edit/delete
- [ ] use readable product/bin labels where possible
- [ ] route from Inventory workspace item if active, or add an inactive/active item carefully based on permissions

---

# F. Read-Only Inventory Movements View

Add read-only movement ledger page if backend allows SELECT.

Suggested file:

- [ ] `src/components/grn/InventoryMovementsPage.tsx`

Display columns:

- [ ] Movement Date
- [ ] Movement Type
- [ ] Source
- [ ] Product
- [ ] Batch
- [ ] Bin
- [ ] Qty Delta
- [ ] Created By

Rules:

- [ ] read-only only
- [ ] no create/edit/delete
- [ ] positive and negative quantities should be visually distinct if easy
- [ ] route from Inventory workspace item if active, or document why deferred

---

# G. API Layer

Extend `src/lib/grn-api.ts` or create `src/lib/inventory-api.ts`.

Add typed wrappers if needed:

- [ ] `listCurrentInventory(tenantId, filters?)`
- [ ] `listInventoryMovements(tenantId, filters?)`

Do not add write APIs for movement/current inventory.

---

# H. GRN UI Polish

Improve professional usability:

- [ ] add client-side search on GRN list by GRN number/supplier
- [ ] show line count consistently without `any`
- [ ] avoid inline `any` in `GrnListPage`
- [ ] cache Product/UOM/Bin lists per form session if simple
- [ ] show clear empty states
- [ ] show helpful validation below line grid
- [ ] keep compact enterprise density

---

# I. Tests

Add/update tests:

- [ ] `tests/frontend/grn-ui.spec.tsx`

Coverage:

- [ ] read-only detail shows product/UOM/bin labels
- [ ] posted GRN cannot be edited from UI
- [ ] post confirmation appears
- [ ] current inventory read-only page renders
- [ ] movement ledger read-only page renders

---

# J. Verification Commands

Run and document exact output:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Record the latest exact `npm run test` numbers. Do not leave old contradictory test counts in reports.

---

# K. AI Run Report

Create:

- [ ] `docs/ai-runs/2026-06-01_phase-4-3-grn-ui-hardening.md`

Must include:

- [ ] final commit hash
- [ ] files created/modified
- [ ] authenticated browser verification result
- [ ] screenshot paths or local-only note
- [ ] current inventory verification
- [ ] movement ledger verification
- [ ] command results
- [ ] known gaps
- [ ] next recommended task

---

# L. Out Of Scope

Do not implement in this phase:

- [ ] Purchase Orders
- [ ] supplier invoices/payments
- [ ] transfers
- [ ] adjustments
- [ ] cycle counts
- [ ] reservations
- [ ] valuation/FIFO/weighted average
- [ ] cancellation/reversal flow
- [ ] full workflow engine
- [ ] full naming series engine

---

# M. Acceptance Criteria

Phase 4.3 is complete only when:

- [ ] authenticated browser GRN flow is verified against Supabase Cloud
- [ ] posted GRN detail does not show raw UUIDs for normal labels
- [ ] post action has confirmation and friendly duplicate-post handling
- [ ] Current Inventory is visible read-only or explicitly deferred with reason
- [ ] Inventory Movements are visible read-only or explicitly deferred with reason
- [ ] test/build results are documented with current exact counts
- [ ] AI run report exists

After Phase 4.3, decide between:

- Phase 4.4: GRN polish and cancellation/reversal planning
- Phase 5: Purchase Orders
- Phase 5 alternative: Inventory transfer/adjustment architecture
