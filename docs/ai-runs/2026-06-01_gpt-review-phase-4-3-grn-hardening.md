# GPT Review Report: Phase 4.3 GRN UI Hardening

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commit

- `73073fd` — Phase 4.3 GRN UI hardening: inventory views, post dialog, search, line_count fix, tests

## Files Reviewed

- `docs/PHASE_4_3_GRN_UI_HARDENING.md`
- `src/components/grn/GrnDetailPage.tsx`
- `src/components/grn/GrnListPage.tsx`
- `src/components/grn/CurrentInventoryPage.tsx`
- `src/components/grn/InventoryMovementsPage.tsx`
- `src/components/metadata/DynamicRouteRenderer.tsx`
- `src/lib/inventory-api.ts`
- `supabase/migrations/0036_inventory_list_rpcs.sql`
- `progress.md`

## Review Result

Phase 4.3 is accepted as a useful GRN hardening step, but not yet production-clean.

It correctly adds:

- readable labels in posted GRN detail
- post confirmation dialog
- client-side GRN search
- read-only Current Inventory view
- read-only Inventory Movements view
- read-only inventory RPC wrappers
- route handling for `current_inventory` and `movements`

## What Is Good

### GRN detail labels

`GrnDetailPage` now loads Products, UOMs, and Bins and passes those arrays into `GrnLineGrid`, so posted detail can display readable labels instead of raw UUIDs.

### Read-only inventory visibility

`CurrentInventoryPage` and `InventoryMovementsPage` provide the first inspection screens after GRN posting.

### Routing

`DynamicRouteRenderer` now routes:

- `grn` → `GrnListPage`
- `current_inventory` → `CurrentInventoryPage`
- `movements` → `InventoryMovementsPage`

### Post UX

`GrnListPage` adds confirmation, `postingId`, and redirects posted edit attempts to read-only detail.

## Important Gaps / Risks

### 1. AI run report is missing or not named as required

The Phase 4.3 doc claims an AI run report exists, but `docs/ai-runs/2026-06-01_phase-4-3-grn-ui-hardening.md` was not found. This must be fixed.

### 2. `progress.md` does not clearly summarize Phase 4.2/4.3 yet

`progress.md` still prominently shows Phase 4 as 4.1 backend foundation. It should include Phase 4.2 and 4.3 summaries with final commit hashes.

### 3. Inventory list RPCs need SQL hardening

In `0036_inventory_list_rpcs.sql`, the `jsonb_agg(...)` queries return `null` when no rows exist. The frontend expects arrays. These RPCs should return `[]` for empty results.

Also, `LIMIT/OFFSET` should be applied to the row set before aggregation using a subquery/CTE. In the current aggregate query shape, the limit can effectively apply after aggregation, which is not the intended pagination behavior.

### 4. Inventory workspace item activation must be verified

`DynamicRouteRenderer` supports `current_inventory` and `movements`, but the workspace items must be active and permitted in metadata for users to see them. Earlier migrations inserted these items as inactive. Phase 4.4 must verify or activate them intentionally.

### 5. `inventory-api.ts` contains legacy write helpers

The new read-only functions are good, but the same file still contains many legacy write helpers for stock transfers, adjustments, reservations, valuation, and old GRN functions. Some of those features are explicitly out of scope and may reference dropped legacy tables/functions.

This is dangerous because it makes the API layer look more capable than the backend really is.

Phase 4.4 should isolate or mark those legacy helpers as deprecated/unavailable, and preferably keep the read-only inventory wrappers clean.

### 6. Authenticated browser evidence is still weak unless screenshots/report exist

The Phase 4.3 doc says authenticated browser verification passed, but the required run report and screenshot paths are missing. This should be corrected.

## Decision

Proceed to Phase 4.4: GRN + Inventory Production Hardening.

Do not start Purchase Orders, transfers, adjustments, or valuation yet.

## Next Phase Requirements

Phase 4.4 should:

1. Add the missing AI run report.
2. Update `progress.md` with Phase 4.2/4.3 final summaries.
3. Fix inventory list RPC empty-array and pagination behavior.
4. Confirm/activate Current Inventory and Movements Ledger workspace items.
5. Clean up or deprecate legacy inventory write helpers.
6. Verify authenticated Supabase Cloud browser flow with evidence.
7. Re-run commands and document exact results.

## After Phase 4.4

Recommended next step: GRN cancellation/reversal architecture.

Reason: before adding Purchase Orders, the system needs a safe way to reverse a posted receipt without mutating historical inventory movements.
