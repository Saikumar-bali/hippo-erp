# Phase 4.9 Tasks: Builder Hardening + Generic Document Cleanup

Active branch: `phase-2.5-metadata-engine`

Goal: Finish the builder-first Metadata Studio milestone by fixing the visible Purchase Invoice backend banner, updating reports, and adding a clearer publish/check flow before starting Purchase Orders or CRM.

## Why This Phase Exists

Phase 4.8 made Metadata Studio much better. It added builder screens for DocTypes, fields, list views, form layouts, menu items, and access.

But the Phase 4.8 browser report still showed one visible problem:

```text
function row_to_jsonb(record) does not exist
```

That error is now fixed, the builder flow is clearer, and the generic_json Purchase Invoice demo is re-verified.

---

## A. Docs And Review

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-phase-4-8-builder-ux.md`
- [x] Update `docs/ai-runs/2026-06-01_phase-4-8-metadata-studio-builder-ux.md` with final commit hash `6259c72e1337421f06084c00462bfbee2a86d483`
- [x] Create `docs/PHASE_4_9_BUILDER_HARDENING_GENERIC_DOCUMENT_CLEANUP.md`
- [x] Create `docs/ai-runs/2026-06-01_phase-4-9-builder-hardening-generic-document-cleanup.md`
- [x] Update `progress.md`

---

## B. Fix `row_to_jsonb(record)` Error

Find the source of this backend error:

```text
function row_to_jsonb(record) does not exist
```

Tasks:

- [x] Search migrations and SQL functions for `row_to_jsonb`
- [x] Replace invalid `row_to_jsonb(record)` usage with valid PostgreSQL JSON conversion
- [x] Add migration `0039_generic_document_rpc_cleanup.sql`
- [x] Verify Purchase Invoice edit no longer shows the banner
- [x] Verify update still persists

Implemented with:

- `supabase/migrations/0039_generic_document_rpc_cleanup.sql`
- `erp_get_document()` now returns an explicit `jsonb_build_object(...)`
- legacy helper `public.row_to_jsonb(record)` dropped after the RPC stopped using it

---

## C. Publish Checklist Path

Improve builder usability:

- [x] Add clear link/button from Metadata Studio home to Check / Repair DocType
- [x] From DocType Builder, after save, show next-step buttons:
  - [x] Fields
  - [x] List View
  - [x] Form Layout
  - [x] Menu
  - [x] Access
  - [x] Check / Repair
- [x] From Access Builder, show `Open Check / Repair DocType` note or button

Do not build a huge wizard yet. Just make the flow easier to follow.

---

## D. Builder Empty States / Guidance

Improve first-time usability:

- [x] DocType Builder: explain `generic_json` vs `physical_rpc`
- [x] Field Builder: show example first fields
- [x] List View Builder: show guidance when no fields are marked list view
- [x] Form Layout Builder: show guidance when no fields are assigned
- [x] Menu Builder: explain DocType target dropdown and permission suggestion
- [x] Access Builder: explain view/create/update/delete access flow

---

## E. Browser Verification

Re-run browser verification:

- [x] Open Metadata Studio
- [x] Create or use Purchase Invoice demo
- [x] Edit Purchase Invoice demo record
- [x] Confirm no `row_to_jsonb(record)` banner appears
- [x] Confirm update persists
- [x] Run Check / Repair DocType
- [x] Confirm checklist passes

Screenshots:

- [x] Local-only screenshots captured under `C:\tmp\phase-4-9-builder-hardening`
- [ ] Not committed into the repo

---

## F. Commands

Run and document:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Known pre-existing failures remain separate from Phase 4.9.

---

## G. Acceptance Criteria

Phase 4.9 is complete only when:

- [x] Purchase Invoice edit no longer shows `row_to_jsonb(record)` error
- [x] Generic document update still persists
- [x] Builder flow has clearer next-step guidance
- [x] Check / Repair remains accessible from builder workflow
- [x] Browser verification is documented
- [x] AI run report exists

After Phase 4.9, decide between:

- Phase 5: Purchase Orders
- Phase 5 alternative: CRM metadata-first module
- Phase 4.10: Builder publish wizard polish
