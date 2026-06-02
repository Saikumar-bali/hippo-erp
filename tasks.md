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
- [ ] Create `docs/PHASE_4_8_METADATA_STUDIO_BUILDER_UX.md`
- [ ] Create `docs/ai-runs/2026-06-01_phase-4-8-metadata-studio-builder-ux.md`
- [ ] Update `progress.md`

---

## B. Metadata Studio Home

Update:

- [ ] `src/components/metadata-studio/MetadataStudioHome.tsx`

Add clear cards:

- [ ] DocType Builder
- [ ] Field Builder
- [ ] List View Builder
- [ ] Form Layout Builder
- [ ] Menu Builder
- [ ] Access Builder
- [ ] Check / Repair DocType

Move raw metadata tables under `Advanced Metadata Tables`.

---

## C. DocType Builder

Create:

- [ ] `src/components/metadata-studio/DocTypeBuilder.tsx`

Must include:

- [ ] Label input
- [ ] Auto-generated key
- [ ] Module dropdown
- [ ] Schema dropdown: `app`, `wh`
- [ ] Storage dropdown: `generic_json`, `physical_rpc`
- [ ] Company Scoped toggle
- [ ] Description
- [ ] Save button

Defaults:

- [ ] schema = `app`
- [ ] storage = `generic_json`

---

## D. Field Builder

Create:

- [ ] `src/components/metadata-studio/DocFieldBuilder.tsx`

Must include:

- [ ] Select DocType
- [ ] Add/edit/reorder fields
- [ ] Label input
- [ ] Auto-generated fieldname
- [ ] Field Type dropdown
- [ ] Select options editor
- [ ] Link DocType dropdown
- [ ] Required toggle
- [ ] In List View toggle
- [ ] In Filter toggle
- [ ] Hidden toggle

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

- [ ] `src/components/metadata-studio/ListViewBuilder.tsx`

Must include:

- [ ] Select DocType
- [ ] Available fields
- [ ] Selected columns
- [ ] Add/remove/reorder columns
- [ ] Column label and width controls
- [ ] Search fields selector
- [ ] Filter fields selector
- [ ] Preview table
- [ ] Save generated list metadata

No JSON writing in normal mode.

---

## F. Form Layout Builder

Create:

- [ ] `src/components/metadata-studio/FormLayoutBuilder.tsx`

Must include:

- [ ] Select DocType
- [ ] Add section
- [ ] Rename section
- [ ] One/two-column choice
- [ ] Assign fields to section
- [ ] Reorder fields
- [ ] Preview form
- [ ] Save generated layout metadata

No JSON writing in normal mode.

---

## G. Menu Builder

Create:

- [ ] `src/components/metadata-studio/WorkspaceMenuBuilder.tsx`

Must include:

- [ ] Select workspace
- [ ] Show menu items
- [ ] Add/edit menu item
- [ ] Item type dropdown
- [ ] DocType target dropdown
- [ ] Page target dropdown for known pages
- [ ] Auto-suggest view key for DocType items
- [ ] Active toggle
- [ ] Sort order controls

---

## H. Access Builder

Create:

- [ ] `src/components/metadata-studio/AccessBuilder.tsx`

Must include:

- [ ] Select DocType
- [ ] Show standard access keys for view/create/update/delete
- [ ] Create missing access keys
- [ ] Enable owner/admin access
- [ ] Show clear result messages

---

## I. Routing

Update:

- [ ] `src/components/metadata/DynamicRouteRenderer.tsx`

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

---

## L. Acceptance Criteria

Phase 4.8 is complete only when:

- [ ] Metadata Studio is builder-first
- [ ] schema uses dropdown
- [ ] field type uses dropdown
- [ ] List View can be built without JSON
- [ ] Form Layout can be built without JSON
- [ ] Menu target uses dropdown
- [ ] Access setup is handled by UI
- [ ] Purchase Invoice demo works through builder screens
- [ ] AI run report exists
