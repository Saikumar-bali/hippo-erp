# GPT Review Report: Phase 4.6 GRN Cancellation / Reversal

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commit

- `c2aa2ee4ce641cc58702bb3dc0b7e63ffb51ef44` — Phase 4.6 GRN cancellation reversal: migration 0038, RPC, CancelGrnDialog, simulation, UI

## Files Reviewed

- `supabase/migrations/0038_grn_cancellation_reversal.sql`
- `docs/ai-runs/2026-06-01_phase-4-6-grn-cancellation-reversal.md`
- `src/components/grn/GrnDetailPage.tsx`
- `src/components/grn/CancelGrnDialog.tsx`
- `progress.md`
- `tasks.md`

## Review Result

Phase 4.6 is accepted.

The implementation follows the correct ERP inventory pattern:

- It does not edit or delete original `GRN_RECEIPT` inventory movements.
- It creates `REVERSAL` movement rows with negative quantity.
- It stores cancellation reason and timestamp on the GRN.
- It blocks duplicate/draft/no-reason cancellation.
- It reduces current inventory transactionally.
- It keeps cancelled GRNs read-only from the normal UI path.

## What Is Good

### Backend

`0038_grn_cancellation_reversal.sql` adds `cancelled_by`, `cancelled_at`, `cancel_reason`, `is_reversal`, and `reversal_of_movement_id`. It also seeds the `cancel_grn` permission and implements `wh_cancel_grn`.

The RPC locks the GRN row, validates posted status, requires a reason, validates `cancel_grn`, checks current inventory, inserts reversal movements, decrements current inventory, soft-deactivates GRN-created batches, and marks the GRN cancelled.

### UI

`CancelGrnDialog` requires a reason and warns the user that reversal entries will be created. `GrnDetailPage` shows the cancel button only for posted GRNs and reloads after cancellation.

### Simulation

The run report documents 12 passing simulation checks covering posting, cancellation, reversal movement creation, original movement preservation, inventory reduction, duplicate cancellation, missing reason, and draft cancellation.

## Cautions

### 1. Final commit placeholders

The Phase 4.6 AI report and `progress.md` still contain `Final Commit: *(not yet committed)*`. This should be updated in the next cleanup phase or by CLI-AI when it pulls the latest branch.

### 2. UI permission visibility

The Cancel button currently appears for any posted GRN in the detail page. Backend permission still protects the action, but later UI should hide the button unless the user has `cancel_grn`.

### 3. Original movement ambiguity

The RPC uses `limit 1` when finding the original `GRN_RECEIPT` movement. The current system likely creates one movement per line, but a future hardening pass should assert uniqueness or raise an error if multiple original movements exist for one line.

### 4. Browser screenshots

The report says browser screenshots were not captured. That is acceptable for now because Supabase Cloud SQL/E2E checks passed, but user-facing cancellation should be browser-verified later.

## Decision

Do not start Purchase Orders immediately.

The user is currently confused about manually completing a metadata-driven menu item and hitting permission errors. That is a developer-side UX gap. Before adding another large business module, fix the manual DocType/menu completion flow.

## Next Phase

Proceed to Phase 4.7: Metadata Studio Manual App Builder & Permission Repair.

This phase should make it clear how to create a complete manual menu item from the browser and how to diagnose/repair missing DocType fields, list views, actions, workspace item, storage strategy, and permissions.
