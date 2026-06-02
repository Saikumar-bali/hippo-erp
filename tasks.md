# Phase 4.8 Tasks: Metadata Studio Builder UX

Active branch: `phase-2.5-metadata-engine`

Goal: Make Metadata Studio easy to use through builder screens. Raw metadata tables should stay available, but normal work should happen through guided builders.

## Why This Phase Exists

The current UI still feels too raw. A developer should not need to manually type internal schema names, field type strings, list-view JSON, form-layout JSON, or menu target strings.

Current issues:

- DocTypes still open as raw table rows.
- DocFields still open as raw table rows.
- Field Type is not a friendly picker everywhere.
- List View still expects JSON.
- Form Layout still expects JSON.
- Menu item target still requires too much internal knowledge.

---

## A. Docs

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-phase-4-7-manual-builder.md`
- [x] Create `docs/PHASE_4_8_METADATA_STUDIO_BUILDER_UX.md`
- [x] Create `docs/ai-runs/2026-06-01_phase-4-8-metadata-studio-builder-ux.md`
- [x] Update `progress.md`

---

## B. Metadata Studio Home

Update:

- [x] `src/components/metadata-studio/MetadataStudioHome.tsx`

Add clear cards:

- [x] DocType Builder
- [x] Field Builder
- [x] List View Builder
- [x] Form Layout Builder
- [x] Menu Builder
- [x] Access Builder
- [x] Check / Repair DocType

Move raw metadata tables under `Advanced Metadata Tables`.

---

## C. DocType Builder

Create:

- [x] `src/components/metadata-studio/DocTypeBuilder.tsx`

Must include:

- [x] Label input
- [x] Auto-generated key
- [x] Module dropdown
- [x] Schema dropdown: `app`, `wh`
- [x] Storage dropdown: `generic_json`, `physical_rpc`
- [x] Company Scoped toggle
- [x] Description
- [x] Save button

Defaults:

- [x] schema = `app`
- [x] storage = `generic_json`

---

## D. Field Builder

Create:

- [x] `src/components/metadata-studio/DocFieldBuilder.tsx`

Must include:

- [x] Select DocType
- [x] Add/edit/reorder fields
- [x] Label input
- [x] Auto-generated fieldname
- [x] Field Type dropdown
- [x] Select options editor
- [x] Link DocType dropdown
- [x] Required toggle
- [x] In List View toggle
- [x] In Filter toggle
- [x] Hidden toggle

Supported types:

- Data
- Text
- Int
- Float
- Check
- Select
- Link
- Date
- Datetime

---

## E. List View Builder

Create:

- [x] `src/components/metadata-studio/ListViewBuilder.tsx`

Must include:

- [x] Select DocType
- [x] Available fields
- [x] Selected columns
- [x] Add/remove/reorder columns
- [x] Column label and width controls
- [x] Search fields selector
- [x] Filter fields selector
- [x] Preview table
- [x] Save generated list metadata

No JSON writing in normal mode.

---

## F. Form Layout Builder

Create:

- [x] `src/components/metadata-studio/FormLayoutBuilder.tsx`

Must include:

- [x] Select DocType
- [x] Add section
- [x] Rename section
- [x] One/two-column choice
- [x] Assign fields to section
- [x] Reorder fields
- [x] Preview form
- [x] Save generated layout metadata

No JSON writing in normal mode.

---

## G. Menu Builder

Create:

- [x] `src/components/metadata-studio/WorkspaceMenuBuilder.tsx`

Must include:

- [x] Select workspace
- [x] Show menu items
- [x] Add/edit menu item
- [x] Item type dropdown
- [x] DocType target dropdown
- [x] Page target dropdown for known pages
- [x] Auto-suggest view key for DocType items
- [x] Active toggle
- [x] Sort order controls

---

## H. Access Builder

Create:

- [x] `src/components/metadata-studio/AccessBuilder.tsx`

Must include:

- [x] Select DocType
- [x] Show standard access keys for view/create/update/delete
- [x] Create missing access keys
- [x] Enable owner/admin access
- [x] Show clear result messages

---

## I. Routing

Update:

- [x] `src/components/metadata/DynamicRouteRenderer.tsx`

Add routes for all new builder screens.

---

## J. Browser Verification

Verify:

- [ ] Metadata Studio is builder-first
- [ ] Purchase Invoice demo can be built using builder screens
- [ ] Field type is selected from dropdown
- [ ] List view is built without JSON
- [ ] Form layout is built without JSON
- [ ] Menu item target is selected from dropdown
- [ ] Demo record can be created, edited, and deactivated

Browser note:

- Local Vite app served successfully at `http://127.0.0.1:4173`
- Authenticated verification remains pending because the provided local login attempt did not progress past the login screen in this CLI/browser environment

---

## K. Commands

Run:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Results:

- `npm run typecheck` -> PASS
- `npm run lint` -> PASS with 42 pre-existing warnings
- `npm run test` -> 44 passed, 6 failed (pre-existing auth/dashboard/users failures outside Phase 4.8)
- `npm run build` -> PASS
- `npm run test:simulation` -> PASS as readiness script for manual SQL execution

---

## L. Acceptance Criteria

Phase 4.8 is complete only when:

- [x] Metadata Studio is builder-first
- [x] schema uses dropdown
- [x] field type uses dropdown
- [x] List View can be built without JSON
- [x] Form Layout can be built without JSON
- [x] Menu target uses dropdown
- [x] Access setup is handled by UI
- [ ] Purchase Invoice demo works through builder screens
- [x] AI run report exists
