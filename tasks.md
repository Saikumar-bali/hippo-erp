# Phase 4.9 Tasks: Builder Hardening + Generic Document Cleanup

Active branch: `phase-2.5-metadata-engine`

Goal: Finish the builder-first Metadata Studio milestone by fixing the visible Purchase Invoice backend banner, updating reports, and adding a clearer publish/check flow before starting Purchase Orders or CRM.

## Why This Phase Exists

Phase 4.8 made Metadata Studio much better. It added builder screens for DocTypes, fields, list views, form layouts, menu items, and access.

But the Phase 4.8 browser report still shows one visible problem:

```text
function row_to_jsonb(record) does not exist
```

The edit persisted, but a visible backend error banner is not acceptable before building more modules.

---

## A. Docs And Review

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-phase-4-8-builder-ux.md`
- [ ] Update `docs/ai-runs/2026-06-01_phase-4-8-metadata-studio-builder-ux.md` with final commit hash `6259c72e1337421f06084c00462bfbee2a86d483`
- [ ] Create `docs/PHASE_4_9_BUILDER_HARDENING_GENERIC_DOCUMENT_CLEANUP.md`
- [ ] Create `docs/ai-runs/2026-06-01_phase-4-9-builder-hardening-generic-document-cleanup.md`
- [ ] Update `progress.md`

---

## B. Fix `row_to_jsonb(record)` Error

Find the source of this backend error:

```text
function row_to_jsonb(record) does not exist
```

Likely area:

- generic document RPCs
- generic document update/get helpers
- Supabase SQL function returning JSON from record rows

Tasks:

- [ ] Search migrations and SQL functions for `row_to_jsonb`
- [ ] Replace invalid `row_to_jsonb(record)` usage with valid PostgreSQL JSON conversion
- [ ] Add migration if needed, e.g. `0039_generic_document_rpc_cleanup.sql`
- [ ] Verify Purchase Invoice edit no longer shows the banner
- [ ] Verify update still persists

Expected PostgreSQL alternatives:

- `to_jsonb(row_alias)`
- `row_to_json(row_alias)::jsonb`
- explicit `jsonb_build_object(...)`

---

## C. Publish Checklist Path

Improve builder usability:

- [ ] Add clear link/button from Metadata Studio home to Check / Repair DocType
- [ ] From DocType Builder, after save, show next-step buttons:
  - Fields
  - List View
  - Form Layout
  - Menu
  - Access
  - Check / Repair
- [ ] From Access Builder, show “Open Check / Repair DocType” note or button if practical

Do not build a huge wizard yet. Just make the flow easier to follow.

---

## D. Builder Empty States / Guidance

Improve first-time usability:

- [ ] DocType Builder: explain `generic_json` vs `physical_rpc`
- [ ] Field Builder: show example first fields
- [ ] List View Builder: show guidance when no fields are marked list view
- [ ] Form Layout Builder: show guidance when no fields are assigned
- [ ] Menu Builder: explain DocType target dropdown and permission suggestion
- [ ] Access Builder: explain view/create/update/delete access flow

---

## E. Browser Verification

Re-run browser verification:

- [ ] Open Metadata Studio
- [ ] Create or use Purchase Invoice demo
- [ ] Edit Purchase Invoice demo record
- [ ] Confirm no `row_to_jsonb(record)` banner appears
- [ ] Confirm update persists
- [ ] Run Check / Repair DocType
- [ ] Confirm checklist passes

Screenshots:

- [ ] Commit screenshots if practical under `docs/ai-runs/screenshots/phase-4-9-builder-hardening/`
- [ ] If local-only, document exact local paths

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

Document known pre-existing failures separately.

---

## G. Acceptance Criteria

Phase 4.9 is complete only when:

- [ ] Purchase Invoice edit no longer shows `row_to_jsonb(record)` error
- [ ] Generic document update still persists
- [ ] Builder flow has clearer next-step guidance
- [ ] Check / Repair remains accessible from builder workflow
- [ ] Browser verification is documented
- [ ] AI run report exists

After Phase 4.9, decide between:

- Phase 5: Purchase Orders
- Phase 5 alternative: CRM metadata-first module
- Phase 4.10: Builder publish wizard polish
