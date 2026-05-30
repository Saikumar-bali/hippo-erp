# Phase 2.9 Tasks: Custom DocType Wizard UX

Active branch: `phase-2.5-metadata-engine`

Goal: Make Metadata Studio feel like a real Frappe-style developer side by adding a guided wizard that creates all required metadata for a working `generic_json` custom DocType.

## Why This Phase Exists

Phase 2.8 added generic JSON storage, but the user experience is still too raw.

Creating only a row in `app.erp_doctypes` is not enough. A working custom DocType needs:

1. DocType
2. DocFields
3. List View
4. Form Layout
5. DocType Actions
6. Workspace Item
7. Storage strategy / data API

The wizard should create these pieces together.

---

# A. Planning And Docs

- [ ] Create `docs/PHASE_2_9_CUSTOM_DOCTYPE_WIZARD.md`
- [ ] Update `docs/METADATA_ENGINE.md` with the wizard role in the architecture
- [ ] Update `progress.md` briefly after implementation
- [x] Add GPT review report: `docs/ai-runs/2026-05-30_gpt-review-phase-2-8-and-ui.md`

---

# B. Metadata Studio UI

Add:

- [ ] `src/components/metadata-studio/CustomDocTypeWizard.tsx`

Update:

- [ ] `src/components/metadata-studio/MetadataStudioHome.tsx`
- [ ] `src/components/metadata-studio/MetadataDataTable.tsx` if needed
- [ ] `src/components/metadata/DynamicRouteRenderer.tsx` if needed

Requirements:

- [ ] Metadata Studio home has a primary action: `Create Custom DocType`
- [ ] Raw metadata tables move under an `Advanced Metadata Tables` section visually
- [ ] Wizard explains that a working DocType requires fields, views, layout, actions, workspace item, and storage
- [ ] Wizard uses compact enterprise UI, not large marketing-card styling

---

# C. Wizard Steps

## Step 1: Basic Info

- [ ] DocType label input
- [ ] Auto-generate lowercase snake_case `doctype_key`
- [ ] Module select
- [ ] Route auto-generated from label, editable
- [ ] Storage strategy defaults to `generic_json`
- [ ] Company scoped defaults to true
- [ ] Reject uppercase or invalid keys

## Step 2: Fields

- [ ] Add/edit/remove fields
- [ ] Field label input
- [ ] Auto-generate lowercase snake_case `fieldname`
- [ ] Field type select: Data, Text, Int, Float, Check, Select, Link, Date, Datetime
- [ ] Required checkbox
- [ ] In List View checkbox
- [ ] In Standard Filter checkbox
- [ ] Sort order handling
- [ ] Reject duplicate fieldnames
- [ ] Require at least one Data field or title/name field

## Step 3: List View

- [ ] Auto-generate list columns from fields marked `in_list_view`
- [ ] Auto-generate search fields from Data fields
- [ ] Default sort by first list column
- [ ] Allow preview of generated columns

## Step 4: Form Layout

- [ ] Auto-generate `Basic Info` section
- [ ] Include all non-hidden fields
- [ ] Preview generated section JSON

## Step 5: Actions And Permissions

- [ ] Generate actions: read, create, update, deactivate
- [ ] For now allow mapping to existing Product permissions for testing
- [ ] Show warning that real domain permissions should be created later
- [ ] Do not silently create broad permissions without explicit confirmation

## Step 6: Workspace

- [ ] Workspace select
- [ ] Workspace item label defaults to plural label
- [ ] Item type = `doctype`
- [ ] Target = generated `doctype_key`
- [ ] Required permission = read permission
- [ ] Active by default

## Step 7: Preview And Create

- [ ] Show all generated metadata before creating
- [ ] On confirm, insert all metadata rows in correct order:
  - [ ] DocType
  - [ ] DocFields
  - [ ] List View
  - [ ] Form Layout
  - [ ] DocType Actions
  - [ ] Workspace Item
- [ ] Show success message
- [ ] Tell user to open sidebar item and create first record
- [ ] Refresh workspace navigation if possible

---

# D. Backend / API Requirements

Use existing metadata-studio API if safe. Add a helper if needed:

- [ ] `createCustomDocTypeBundle()` in `src/lib/metadata/metadata-studio-api.ts`

This helper should:

- [ ] Validate metadata payload client-side before insert
- [ ] Insert records in correct order
- [ ] Roll back manually if any later insert fails, if practical
- [ ] Never use service-role in frontend
- [ ] Work with Supabase Cloud schema `app`

Future improvement: replace this with a single safe RPC transaction.

---

# E. Simulation Test

Add:

- [ ] `tests/simulations/custom_doctype_wizard_flow.sql`

Simulation must verify:

- [ ] Create sample custom DocType `supplier_test` with `storage_strategy = generic_json`
- [ ] Create DocFields
- [ ] Create List View
- [ ] Create Form Layout
- [ ] Create DocType Actions
- [ ] Create Workspace Item
- [ ] Create one document with `erp_create_document`
- [ ] List document with `erp_list_documents`
- [ ] Update document with `erp_update_document`
- [ ] Deactivate document with `erp_deactivate_document`
- [ ] Reject unknown field
- [ ] Reject missing required field
- [ ] Roll back at end

Update:

- [ ] `scripts/run-simulation.cjs`

---

# F. UI Review Requirements

CLI-AI must review and report:

- [ ] Wizard layout is compact
- [ ] Steps are understandable
- [ ] Primary action is obvious
- [ ] Raw metadata tables are still available but secondary
- [ ] Error messages explain what is missing
- [ ] Success message explains where the new DocType appears
- [ ] Sidebar item appears after refresh/reload
- [ ] New custom DocType can create a record through generic JSON storage

---

# G. Verification Commands

Run and document exact output:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Supabase Cloud verification required:

- [ ] Apply any needed migration/seeds to Supabase Cloud
- [ ] Run `custom_doctype_wizard_flow.sql` on Supabase Cloud
- [ ] Record PASS/FAIL in `progress.md`
- [ ] Add detailed report in `docs/ai-runs/`

---

# H. AI Run Report

Create:

- [ ] `docs/ai-runs/2026-05-30_phase-2-9-custom-doctype-wizard.md`

Must include:

- [ ] Goal
- [ ] Branch/final commit
- [ ] Files inspected
- [ ] Files created
- [ ] Files modified
- [ ] Supabase Cloud changes
- [ ] Simulation results
- [ ] Frontend verification
- [ ] UI review
- [ ] Command results
- [ ] Known gaps
- [ ] Next task

---

# I. Out Of Scope

Do not implement in this phase:

- [ ] Warehouse CRUD
- [ ] GRN
- [ ] Stock Ledger
- [ ] Physical table creation from UI
- [ ] Generic storage for stock-changing transactional DocTypes
- [ ] Workflow transition engine
- [ ] Naming series generation engine

---

# J. Acceptance Criteria

Phase 2.9 is complete only when:

- [ ] Metadata Studio has a clear `Create Custom DocType` wizard
- [ ] Wizard creates all required metadata pieces
- [ ] Created custom DocType appears in selected workspace/sidebar after refresh or reload
- [ ] Created custom DocType opens with `DynamicListPage`
- [ ] User can create at least one generic JSON document record
- [ ] Supabase Cloud simulation passes
- [ ] Build/typecheck/lint/test results are documented
- [ ] Detailed AI run report exists under `docs/ai-runs/`
