# Phase 4.2 Tasks: GRN UI Foundation

Active branch: `phase-2.5-metadata-engine`

Goal: Build the first usable GRN user interface on top of the Phase 4.1 backend RPCs. GRN is a transaction document, so it must use the explicit GRN API wrapper and must not use generic JSON CRUD.

## Why This Phase Exists

Phase 4.1 completed the backend foundation:

- physical `wh.*` transaction tables
- RLS policies
- SECURITY DEFINER RPCs
- `src/lib/grn-api.ts`
- Supabase Cloud simulation passing

Now build the UI carefully:

- create GRN draft
- edit draft lines
- post GRN
- show posted GRN as read-only
- show inventory movements/current inventory as read-only views

---

# A. Review And Docs

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-product-list-and-phase-4-1.md`
- [ ] Create `docs/PHASE_4_2_GRN_UI_FOUNDATION.md`
- [ ] Update `docs/METADATA_ENGINE.md` with the transaction-document UI boundary
- [ ] Update `progress.md` after implementation
- [ ] Create AI run report: `docs/ai-runs/2026-06-01_phase-4-2-grn-ui-foundation.md`

---

# B. Product List Guardrail

Before GRN UI work, verify the Product list fix is still working.

- [ ] Product Master → Products must show useful columns, not only Status and Actions.
- [ ] If fallback warning appears, fix `app.erp_list_views` metadata for `doctype_key = product`, `view_key = default`.
- [ ] Confirm no conflicting `is_default = true` list views affect Product.
- [ ] Add note to the AI run report.

---

# C. GRN Route And Sidebar

Use existing Purchasing workspace metadata seeded in Phase 4.1.

Tasks:

- [ ] Confirm Purchasing workspace is visible for permitted users.
- [ ] Confirm GRN item is visible under Purchasing.
- [ ] Route GRN item to a custom GRN UI component, not `DynamicListPage`.
- [ ] Update `DynamicRouteRenderer.tsx` or route mapping carefully.

Suggested files:

- [ ] `src/components/grn/GrnListPage.tsx`
- [ ] `src/components/grn/GrnDraftFormPage.tsx`
- [ ] `src/components/grn/GrnDetailPage.tsx`
- [ ] `src/components/grn/GrnLineGrid.tsx`
- [ ] `src/components/grn/GrnStatusBadge.tsx`

---

# D. API Usage

Use only:

- [ ] `src/lib/grn-api.ts`

Do not call generic document APIs for GRN.

Required API usage:

- [ ] `listGrns(companyId, filters)`
- [ ] `getGrn(companyId, grnId)`
- [ ] `createGrnDraft(companyId, payload)`
- [ ] `updateGrnDraft(companyId, grnId, payload)`
- [ ] `postGrn(companyId, grnId)`

If `grn-api.ts` is missing necessary types/fields, extend it carefully without changing backend contracts unless required.

---

# E. GRN List UI

Create a compact enterprise list page.

Required columns:

- [ ] GRN Number
- [ ] Supplier
- [ ] Received Date
- [ ] Status
- [ ] QC Status
- [ ] Line Count
- [ ] Posted At
- [ ] Actions

Required controls:

- [ ] Search by GRN number/supplier if API supports it, otherwise client-side search after list load.
- [ ] Status filter: all/draft/posted/cancelled.
- [ ] `+ New GRN` button.
- [ ] Compact empty state.

---

# F. GRN Draft Form UI

Draft form requirements:

Header fields:

- [ ] GRN Number
- [ ] Supplier Name or Supplier Link if available
- [ ] Received Date
- [ ] QC Status
- [ ] Notes

Line grid fields:

- [ ] Product
- [ ] UOM
- [ ] Received Qty
- [ ] Accepted Qty
- [ ] Rejected Qty
- [ ] Batch Number
- [ ] Expiry Date
- [ ] Warehouse/Bin selection

Validation in UI:

- [ ] received_qty > 0
- [ ] accepted_qty + rejected_qty <= received_qty
- [ ] bin required when accepted_qty > 0
- [ ] expiry date required when user enters batch expiry/product requires expiry if API supports it

Actions:

- [ ] Save Draft
- [ ] Cancel
- [ ] Post GRN

---

# G. Posted GRN Detail UI

Posted GRN must be read-only.

Requirements:

- [ ] Show header details.
- [ ] Show line details.
- [ ] Show movement/current-inventory summary if API has enough data.
- [ ] Hide or disable Save Draft.
- [ ] Show posted timestamp and posted by if available.
- [ ] Post button disabled/hidden after posting.

---

# H. Link/Data Loading

GRN form needs selectable master data.

Inspect existing APIs and choose safe source for:

- [ ] Products
- [ ] UOMs
- [ ] Warehouses/Bins

Rules:

- [ ] Products may be physical RPC-backed; do not assume `erp_documents`.
- [ ] Warehouse hierarchy may be `generic_json`; use existing generic API or metadata APIs where safe.
- [ ] Dropdowns should show readable labels, not UUIDs.
- [ ] For first version, dependent filtering can be simple, but document limitations.

---

# I. Read-Only Inventory Views

Add minimal read-only views if backend supports data:

- [ ] Current Inventory list
- [ ] Inventory Movements list

These should be read-only. No direct create/edit/delete.

Suggested files:

- [ ] `src/components/grn/CurrentInventoryPage.tsx`
- [ ] `src/components/grn/InventoryMovementsPage.tsx`

Only implement if the backend API/RPC exposes readable data. Otherwise document as Phase 4.3.

---

# J. Error Handling

GRN UI must surface backend validation clearly:

- [ ] duplicate GRN number
- [ ] invalid quantity
- [ ] missing bin
- [ ] product/UOM/bin not found
- [ ] duplicate posting blocked
- [ ] posted GRN update blocked
- [ ] permission denied

Use clear user-facing messages, not raw stack traces.

---

# K. Browser Verification

Verify with real browser automation if available.

Required flow:

- [ ] Open Purchasing → GRN.
- [ ] Create draft GRN.
- [ ] Add one product line.
- [ ] Select UOM and warehouse/bin.
- [ ] Enter received/accepted/rejected quantities.
- [ ] Save draft.
- [ ] Confirm draft appears in list.
- [ ] Open draft.
- [ ] Post GRN.
- [ ] Confirm status becomes posted.
- [ ] Confirm posted detail is read-only.
- [ ] Confirm duplicate post is blocked.

Screenshots should be committed if possible under:

```text
docs/ai-runs/screenshots/phase-4-2-grn-ui/
```

If screenshots are local-only, say so in the report.

---

# L. Tests

Add frontend tests if practical:

- [ ] `tests/frontend/grn-ui.spec.tsx`

Minimum tests:

- [ ] list page renders
- [ ] draft form validates accepted + rejected <= received
- [ ] posted GRN disables edit/post actions

Do not overbuild tests if the UI is still changing, but cover basic regressions.

---

# M. Verification Commands

Run and document exact output:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Important:

- [ ] Reconcile current test count discrepancy in reports: Phase 3.1 says 32 pass / 8 fail, Phase 4.1 says 34 pass / 6 fail.
- [ ] Record the latest exact test result.
- [ ] Fix any new failures caused by GRN UI.

---

# N. AI Run Report

Create:

- [ ] `docs/ai-runs/2026-06-01_phase-4-2-grn-ui-foundation.md`

Must include:

- [ ] final commit hash
- [ ] files created/modified
- [ ] Product list guardrail result
- [ ] GRN API usage summary
- [ ] browser verification result
- [ ] screenshot paths or local-only note
- [ ] command results
- [ ] known gaps
- [ ] next recommended task

---

# O. Out Of Scope

Do not implement in this phase:

- [ ] Purchase Orders
- [ ] Supplier invoices/payments
- [ ] transfers
- [ ] adjustments
- [ ] cycle counts
- [ ] reservations
- [ ] valuation/FIFO/weighted average
- [ ] full workflow engine
- [ ] full naming series engine
- [ ] cancellation/reversal flow unless backend already supports it safely

---

# P. Acceptance Criteria

Phase 4.2 is complete only when:

- [ ] Product list columns remain fixed.
- [ ] Purchasing → GRN opens a custom GRN list page.
- [ ] User can create and save a draft GRN.
- [ ] User can post a GRN through explicit RPC.
- [ ] Posted GRN becomes read-only.
- [ ] Backend validation errors are shown clearly.
- [ ] Browser verification is documented.
- [ ] Build/typecheck/lint/test results are documented.
- [ ] AI run report exists.

After Phase 4.2, proceed to Phase 4.3: Inventory read-only views polish, cancellation/reversal planning, or GRN workflow improvements depending on gaps.
