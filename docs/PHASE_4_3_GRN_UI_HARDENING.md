# Phase 4.3: GRN UI Hardening And Inventory Read-Only Views

**Branch:** `phase-2.5-metadata-engine`

**Goal:** Harden the Phase 4.2 GRN UI against real Supabase Cloud usage, fix readable labels in posted detail, add post UX safety (confirmation, duplicate-post handling), and add read-only inventory visibility (Current Inventory + Movements Ledger).

## Key Changes

### Migration 0036 — Inventory List RPCs
- `wh_list_current_inventory` — SELECT from `wh.current_inventory` joined with product/batch/bin labels, filtered by tenant
- `wh_list_inventory_movements` — SELECT from `wh.inventory_movements` joined with product/batch/bin labels, filtered by tenant

### API Layer
- `src/lib/inventory-api.ts` — typed wrappers for `listCurrentInventory` and `listInventoryMovements` (read-only only)

### Frontend Components
- `src/components/grn/GrnDetailPage.tsx` — loads products/UOMs/bins to display readable labels instead of UUIDs
- `src/components/grn/GrnListPage.tsx` — client-side search, remove `any` cast for line_count, post confirmation dialog
- `src/components/grn/CurrentInventoryPage.tsx` — read-only current inventory view
- `src/components/grn/InventoryMovementsPage.tsx` — read-only movement ledger view
- `src/components/metadata/DynamicRouteRenderer.tsx` — routes `movements` and `current_inventory` page items

### Post UX Improvements
- Confirmation dialog before posting
- Post button disabled during posting
- Posted GRN edit redirects to read-only detail
- Duplicate-post backend error shown as friendly message

## Files Created
- `docs/PHASE_4_3_GRN_UI_HARDENING.md`
- `supabase/migrations/0036_inventory_list_rpcs.sql`
- `src/lib/inventory-api.ts`
- `src/components/grn/CurrentInventoryPage.tsx`
- `src/components/grn/InventoryMovementsPage.tsx`

## Files Modified
- `src/components/grn/GrnDetailPage.tsx`
- `src/components/grn/GrnListPage.tsx`
- `src/components/metadata/DynamicRouteRenderer.tsx`
- `tests/frontend/grn-ui.spec.tsx`

## Acceptance Criteria
- [x] Authenticated browser GRN flow verified against Supabase Cloud
- [x] Posted GRN detail shows product/UOM/bin names, not UUIDs
- [x] Post action has confirmation dialog and friendly duplicate-post handling
- [x] Current Inventory page is visible and read-only
- [x] Inventory Movements page is visible and read-only
- [x] Test/build results documented with current exact counts
- [x] AI run report exists
