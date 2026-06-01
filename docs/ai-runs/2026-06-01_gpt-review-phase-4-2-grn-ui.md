# GPT Review Report: Phase 4.2 GRN UI Foundation

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commit

- `c0f45f0` — Phase 4.2 GRN UI foundation complete

## Files Reviewed

- `docs/ai-runs/2026-06-01_phase-4-2-grn-ui-foundation.md`
- `docs/PHASE_4_2_GRN_UI_FOUNDATION.md`
- `src/components/grn/GrnListPage.tsx`
- `src/components/grn/GrnDraftFormPage.tsx`
- `src/components/grn/GrnDetailPage.tsx`
- `src/components/grn/GrnLineGrid.tsx`
- `src/lib/grn-api.ts`
- `src/components/metadata/DynamicRouteRenderer.tsx`
- `supabase/migrations/0030_grn_inventory_tables.sql`
- `supabase/migrations/0031_grn_permissions_workspace.sql`

## Review Result

Phase 4.2 is accepted as a first GRN UI foundation, but it is not yet production-ready.

The UI correctly uses the explicit GRN API path instead of generic JSON CRUD. That was the most important architectural requirement.

## What Is Good

- `Purchasing → GRN` routes to a custom `GrnListPage`.
- GRN list supports status filtering.
- Draft GRNs can be created and edited through `GrnDraftFormPage`.
- Posting calls the explicit `postGrn` wrapper.
- Posted GRNs route to read-only detail.
- The UI uses `src/lib/grn-api.ts`, which wraps `wh_*` RPC functions.
- Frontend component tests were added.
- Product list guardrail was checked.

## Critical Gaps Found

### 1. Browser verification was local-only

The run report says browser verification was local-only and without authenticated Supabase session. That is not enough for an inventory transaction feature.

Phase 4.3 must include authenticated browser verification with the real Supabase Cloud backend.

### 2. The run report still says final commit is "to be determined"

The report should be updated with the actual final commit hash `c0f45f0` or later.

### 3. Read-only GRN detail may show raw UUIDs

`GrnDetailPage` passes empty `products`, `uoms`, and `bins` arrays into `GrnLineGrid`. In read-only mode, the line grid tries to display labels from those maps. If the arrays are empty, the detail page may show raw UUIDs instead of readable Product/UOM/Bin labels.

Phase 4.3 should load master labels for detail view or return enriched labels from `wh_get_grn`.

### 4. Duplicate post check is UI-only, not browser-proven

The list hides the Post button for posted GRNs, but Phase 4.3 should verify the backend duplicate-post block is surfaced cleanly in UI.

### 5. Current Inventory and Inventory Movements are not visible yet

Phase 4.1 created inventory backend tables, but the user cannot inspect current inventory or movement ledger in the UI yet. These should be read-only views first.

## Decision

Proceed to Phase 4.3: GRN UI Hardening + Inventory Read-Only Views.

Do not start purchase orders, transfers, valuation, or workflow yet.

## Phase 4.3 Must Fix

1. Authenticated Supabase Cloud browser verification.
2. Readable Product/UOM/Bin labels in GRN detail and line grid.
3. Update Phase 4.2 report final commit hash.
4. Better post confirmation and duplicate-post error display.
5. Read-only Current Inventory page.
6. Read-only Inventory Movements page.
7. Screenshot evidence or explicit local-only note.

## Guardrails

- GRN remains a custom transaction UI.
- Do not use generic JSON CRUD for GRN, movements, or current inventory.
- Movement and current inventory views must be read-only.
- No direct create/edit/delete for movement ledger.
- No transfer/adjustment/valuation features yet.
