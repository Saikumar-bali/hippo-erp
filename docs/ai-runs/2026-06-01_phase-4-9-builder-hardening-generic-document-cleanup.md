# Phase 4.9 AI Run: Builder Hardening + Generic Document Cleanup

## Summary

Completed the builder cleanup milestone for Metadata Studio on `phase-2.5-metadata-engine`.

This run:

- fixed the live generic_json Purchase Invoice edit banner caused by `row_to_jsonb(record)`
- added a new cleanup migration for generic document RPCs
- improved builder guidance and next-step flow
- re-verified Purchase Invoice create/edit/deactivate and Check / Repair in the browser

## Files Created

- `supabase/migrations/0039_generic_document_rpc_cleanup.sql`
- `docs/PHASE_4_9_BUILDER_HARDENING_GENERIC_DOCUMENT_CLEANUP.md`
- `docs/ai-runs/2026-06-01_phase-4-9-builder-hardening-generic-document-cleanup.md`

## Files Updated

- `tasks.md`
- `progress.md`
- `docs/ai-runs/2026-06-01_phase-4-8-metadata-studio-builder-ux.md`
- `src/components/metadata/DynamicRouteRenderer.tsx`
- `src/components/metadata-studio/MetadataStudioHome.tsx`
- `src/components/metadata-studio/DocTypeBuilder.tsx`
- `src/components/metadata-studio/DocFieldBuilder.tsx`
- `src/components/metadata-studio/ListViewBuilder.tsx`
- `src/components/metadata-studio/FormLayoutBuilder.tsx`
- `src/components/metadata-studio/AccessBuilder.tsx`

## SQL / RPC Fix Details

Source of bug in live Supabase project:

- deployed `public.erp_get_document()` still returned `row_to_jsonb(v_doc)`

Cleanup applied:

- `public.erp_get_document()` now returns an explicit `jsonb_build_object(...)`
- `public.row_to_jsonb(record)` was dropped after the RPC stopped using it
- migration applied successfully to Supabase project `bhqgszzvemejfbgndtnf`

## Builder Flow Improvements

- Metadata Studio home now includes a direct `Open Check / Repair` action
- DocType Builder now exposes next-step buttons after save:
  - Fields
  - List View
  - Form Layout
  - Menu
  - Access
  - Check / Repair
- selected DocType now carries into Field/List/Form/Access builders when navigating through the flow
- guidance and empty states were improved in the builder path

## Browser Verification

Local app verified at:

- `http://127.0.0.1:4173`

Authenticated Playwright verification passed:

- existing Purchase Invoice demo record opened in edit mode with no `row_to_jsonb(record)` banner
- existing Purchase Invoice edit persisted
- created one new generic_json Purchase Invoice demo record
- edited that demo record successfully with no banner
- deactivated that demo record successfully
- opened Check / Repair DocType for `purchase_invoice`
- checklist completed with `12 pass`

## Screenshots

Local-only screenshots captured and not committed:

- `C:\tmp\phase-4-9-builder-hardening\01-purchase-invoice-list.png`
- `C:\tmp\phase-4-9-builder-hardening\02-existing-record-updated.png`
- `C:\tmp\phase-4-9-builder-hardening\03-created-record.png`
- `C:\tmp\phase-4-9-builder-hardening\04-updated-record.png`
- `C:\tmp\phase-4-9-builder-hardening\05-deactivated-record.png`
- `C:\tmp\phase-4-9-builder-hardening\06-check-repair-purchase-invoice.png`

## Command Results

- `npm run typecheck` -> PASS
- `npm run lint` -> PASS with 44 warnings, all pre-existing React hook / effect warnings outside the Phase 4.9 scope
- `npm run test` -> 44 passed, 6 failed
- `npm run build` -> PASS
- `npm run test:simulation` -> PASS

Pre-existing `npm run test` failures remained in:
- `tests/frontend/auth-routes.spec.tsx`
- `tests/frontend/auth-state.spec.tsx`
- `tests/frontend/dashboard-kpi.spec.tsx`
- `tests/frontend/permission-gates.spec.tsx`
- `tests/frontend/users-roles.spec.tsx`

## Remaining Gaps

- `npm run test` still has pre-existing frontend failures outside the Phase 4.9 scope
- Metadata Studio builder polish can continue in a future Phase 4.10 if we want a more guided publish flow
