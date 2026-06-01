# Phase 4.4 — GRN + Inventory Production Hardening

**Branch:** `phase-2.5-metadata-engine`

## Why

Phase 4.3 added useful GRN hardening and inventory read-only screens, but review found production-risk gaps:

- Missing AI run report for Phase 4.3
- `progress.md` lacks clear Phase 4.2 and 4.3 summaries
- Inventory list RPCs return `null` instead of `[]` when empty
- LIMIT/OFFSET applied after `jsonb_agg` (effectively no-op)
- Current Inventory / Movements workspace items inactive
- `inventory-api.ts` exposes legacy write helpers for out-of-scope operations
- No Supabase Cloud verification for inventory list RPCs

## Scope

Cleanup and hardening only. No new transaction types (transfers, adjustments, reservations, valuation, workflow).

## Deliverables

1. Phase 4.3 AI run report
2. `progress.md` update with Phase 4.2/4.3 summaries
3. Migration 0037 — fix inventory RPCs (null→[], pre-aggregation filtering)
4. Workspace visibility verification for Current Inventory / Movements
5. `inventory-api.ts` cleanup — isolate read-only, deprecate legacy write helpers
6. Supabase Cloud browser verification
7. Phase 4.4 AI run report

## Database Changes

### RPC `wh_list_current_inventory` (replaces v1)

- Wrap `jsonb_agg` with `COALESCE(..., '[]'::jsonb)`
- Move LIMIT/OFFSET inside a CTE before aggregation
- Keep ordering, permission checks, response shape

### RPC `wh_list_inventory_movements` (replaces v2)

- Same pattern as above

## API Cleanup

New read-only wrappers (`listCurrentInventory`, `listInventoryMovements`) remain in `inventory-api.ts`. Legacy write helpers (transfers, adjustments, reservations, valuation, old GRN flows) are marked `@deprecated` and isolated in a clearly labeled section. No code change required in current UI.

## Verification Results

### Supabase Cloud (2026-06-01)

| Test | Result |
|------|--------|
| `wh_list_current_inventory` (empty tenant) | `{"ok":true,"data":[]}` — returns empty array, not null |
| `wh_list_inventory_movements` (empty tenant) | `{"ok":true,"data":[]}` — returns empty array, not null |
| Current Inventory workspace item | `is_active = true` |
| Movements Ledger workspace item | `is_active = true` |

### Local Build

| Command | Result |
|---------|--------|
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors, 37 warnings (pre-existing) |

## Acceptance Criteria

- [x] Phase 4.3 AI run report exists
- [x] `progress.md` has clear Phase 4.2 and 4.3 summaries
- [x] Inventory list RPCs return arrays and paginate correctly
- [x] Current Inventory / Movements workspace visibility verified
- [x] Legacy inventory API risk documented (deprecated section in `inventory-api.ts`)
- [x] Supabase Cloud verification documented
- [x] Test/build results documented
