# AI Run: Phase 4.4 — GRN + Inventory Production Hardening

**Date:** 2026-06-01
**Branch:** phase-2.5-metadata-engine
**Final Commit:** `771cf49` follow-up fix after CLI-AI commit `5eb7246`

## Summary

Phase 4.4 hardened the GRN and inventory subsystem for production-readiness. Three production-risk gaps from Phase 4.3 were addressed: inventory list RPCs returning `null` instead of `[]`, LIMIT/OFFSET applied after `jsonb_agg` (no-op), and inactive workspace items.

A GPT follow-up patch fixed a missing SQL semicolon in migration `0037_inventory_list_rpcs_hardening.sql`.

## Files Created

| File | Purpose |
|------|---------|
| `docs/PHASE_4_4_GRN_INVENTORY_PRODUCTION_HARDENING.md` | Design document |
| `supabase/migrations/0037_inventory_list_rpcs_hardening.sql` | Replaces RPCs from 0036: COALESCE wrap for jsonb_agg, pre-aggregation LIMIT/OFFSET, workspace activation |
| `docs/ai-runs/2026-06-01_phase-4-4-grn-inventory-hardening.md` | This report |

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/inventory-api.ts` | Reorganized: Phase 4.3+ read-only API moved to top, legacy helpers marked `@deprecated` with section headers |
| `progress.md` | Phase status line updated, Phase 4.2/4.3/4.4 summaries added |
| `supabase/migrations/0037_inventory_list_rpcs_hardening.sql` | GPT follow-up: added final semicolon to workspace activation statement |

## Database Changes

### RPC `wh_list_current_inventory` (replaced)

- `jsonb_agg` wrapped with `COALESCE(..., '[]'::jsonb)` — empty results return `[]` not `null`
- LIMIT/OFFSET moved into a CTE applied before aggregation — pagination now works correctly
- Permission checks, response shape, and ordering preserved

### RPC `wh_list_inventory_movements` (replaced)

- Same pattern as above: COALESCE + CTE pre-aggregation filtering

### Workspace Activation

- `app.erp_workspace_items` set `is_active = true` for `current_inventory` and `movements` item keys

## API Cleanup

- `listCurrentInventory()` and `listInventoryMovements()` remain at top of file
- All 17 legacy write helpers marked `@deprecated` with warnings and isolated section
- New UI components should import only the Phase 4.3+ read-only API

## Supabase Cloud Verification

- `wh_list_current_inventory` — returns `{"ok":true,"data":[]}` for empty tenant
- `wh_list_inventory_movements` — returns `{"ok":true,"data":[]}` for empty tenant
- Workspace items confirmed active via `SELECT is_active FROM app.erp_workspace_items`

## Verification Results

| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 37 warnings (pre-existing) |

## Remaining Gaps

- No auto GRN numbering
- No line-level approval or partial-receipt workflow
- No PO reference in GRN
- No cancellation/reversal flow yet
