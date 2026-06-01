# GPT Review Report: Phase 3.1 Metadata Studio UX Polish

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commits

- `df5c2d6` — Polish Workspace Items grouped UI
- `dff76cb` — docs: update AI run report with browser verification results and fix test assertions (#12)

## Files Reviewed

- `tasks.md`
- `docs/ai-runs/2026-05-30_phase-3-1-metadata-studio-ux-polish.md`
- `src/components/metadata-studio/WorkspaceItemsManager.tsx`
- `src/components/metadata-studio/MetadataDataTable.tsx`

## Review Result

Phase 3.1 is accepted with one caution.

The Metadata Studio UX is now good enough to proceed to Phase 4 planning. Workspace Items is now grouped, searchable, filterable, and visually easier to scan. Generic metadata tables now have search, column filters, JSON previews, sticky headers, and fuller-height layouts.

## Confirmed Improvements

### Workspace Items

The current `WorkspaceItemsManager` now:

- groups items by `workspace_key`
- sorts groups and items
- shows workspace item counts
- supports search by workspace, item key, label, target, and permission
- filters by workspace, item type, and active status
- shows compact type/status badges
- uses a grid-style grouped list instead of repeated raw tables
- uses a full-height card layout with internal scrolling

### Generic Metadata Tables

The current `MetadataDataTable` now:

- supports global search
- supports column filters for common fields such as `doctype_key`, `action_key`, and `permission_key`
- has a full-height flex layout
- uses sticky table headers
- keeps the action column sticky on the right
- previews JSON arrays/objects without flooding the table
- opens JSON in a formatted modal editor

## Caution

The latest AI run report says:

- `npm run typecheck`: PASS
- `npm run lint`: PASS with pre-existing warnings
- `npm run build`: PASS
- `npm run test:simulation`: READY
- `npm run test`: 32 pass, 8 fail

That means the UI phase is acceptable, but the test suite is not fully green. The report says some failures are pre-existing/unrelated, but this must be cleaned up or explicitly triaged during Phase 4.

## Decision

Proceed to Phase 4 planning: GRN and explicit stock posting architecture.

Do not jump straight into coding stock posting. First design the transactional boundary carefully.

## Phase 4 Guardrails

Phase 4 must not use generic JSON CRUD for stock-changing transactions.

Warehouse hierarchy is master data and can use `generic_json`.

GRN, QC, batch creation, bin allocation, and stock ledger posting must use explicit transactional RPC/service logic.

The stock ledger must be append-only or strongly controlled. No direct generic update/delete of posted ledger movements.

## Next Recommended Phase

Phase 4: GRN + Explicit Stock Posting Architecture

Build the plan first:

1. GRN header and lines
2. QC/grading flow
3. Batch creation
4. Bin allocation
5. Stock movement ledger posting
6. Current stock snapshot update strategy
7. Explicit RPC transaction boundary
8. Permission/workflow boundary
9. Simulation tests
10. Browser verification plan
