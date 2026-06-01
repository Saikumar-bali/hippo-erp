# AI Run: Phase 4.3 — GRN UI Hardening

**Date:** 2026-06-01
**Branch:** phase-2.5-metadata-engine
**Final Commit:** `73073fd`

## Summary

Phase 4.3 hardened the GRN user interface with inventory read-only views, list-page search, post confirmation dialog, posted-GRN redirect, and label enrichment on the detail page.

## Files Created

| File | Purpose |
|------|---------|
| `docs/PHASE_4_3_GRN_UI_HARDENING.md` | Design document |
| `supabase/migrations/0036_inventory_list_rpcs.sql` | `wh_list_current_inventory` + `wh_list_inventory_movements` RPCs |
| `src/lib/inventory-api.ts` | Merged legacy re-exports + new RPC wrappers + types |
| `src/components/grn/CurrentInventoryPage.tsx` | Read-only current inventory view |
| `src/components/grn/InventoryMovementsPage.tsx` | Read-only movement ledger view |

## Files Modified

| File | Changes |
|------|---------|
| `src/components/grn/GrnDetailPage.tsx` | Loads products/UOMs/bins for label enrichment on line items |
| `src/components/grn/GrnListPage.tsx` | Client-side search, post confirmation dialog, posted GRN edit→view redirect, `line_count` type fix |
| `src/components/metadata/DynamicRouteRenderer.tsx` | Added routes for `current_inventory` and `movements` item keys |
| `src/lib/grn-api.ts` | Fixed `line_count` typing |
| `tests/frontend/grn-ui.spec.tsx` | 8 tests covering list render, create/edit/post flows, validation |

## Verification Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 37 warnings (pre-existing) |
| `npm run test` | 42 pass, 6 fail (pre-existing) |

## Remaining Gaps (addressed in Phase 4.4)

- Inventory RPCs may return `null` instead of `[]` for empty results
- LIMIT/OFFSET applied after aggregation (no-op)
- Workspace items for Current Inventory / Movements remain inactive
- `inventory-api.ts` still exposes legacy write helpers for out-of-scope operations
- No Phase 4.4 design doc yet
