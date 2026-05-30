# Phase 2.10 Tasks: Custom DocType Wizard Hardening And Real UI Verification

Active branch: `phase-2.5-metadata-engine`

Goal: Harden the Phase 2.9 Custom DocType Wizard so a real authenticated user can create a custom DocType, see it in the sidebar, open it, create a record, edit it, and deactivate it.

## Why This Phase Exists

Phase 2.9 created the wizard and generic metadata bundle creation. But before Warehouse starts, the custom DocType flow must be reliable.

Current gaps:

1. Permission keys can be mapped but not created/granted.
2. Real authenticated CRUD was not fully verified.
3. Duplicate DocType key detection is weak.
4. Sidebar refresh after creation may require manual reload.
5. Final success state needs a clear completion checklist.

---

# A. Planning And Docs

- [x] Add GPT review report: `docs/ai-runs/2026-05-30_gpt-review-phase-2-9-wizard.md`
- [ ] Create `docs/PHASE_2_10_CUSTOM_DOCTYPE_WIZARD_HARDENING.md`
- [ ] Update `docs/METADATA_ENGINE.md` with wizard hardening requirements
- [ ] Update `progress.md` briefly after implementation

---

# B. Permission Handling

Problem: The wizard can generate permission keys, but if those keys do not exist in the permission catalog or are not assigned to the current role, the new DocType may not appear or may not allow CRUD.

Tasks:

- [ ] Inspect existing permission tables and role-permission functions.
- [ ] Add safe helper/RPC if needed to create custom DocType permissions:
  - `view_<doctype_key>`
  - `create_<doctype_key>`
  - `update_<doctype_key>`
  - `delete_<doctype_key>`
- [ ] Grant generated permissions to owner/admin roles by default, if this matches existing role model.
- [ ] Do not grant broad permissions to normal users automatically.
- [ ] Wizard Step 5 must clearly show whether permissions will be:
  - created
  - reused
  - assigned to owner/admin
  - still requiring manual role setup
- [ ] Update simulation to verify permission keys exist and are granted to owner/admin roles.

---

# C. Duplicate And Validation Hardening

Tasks:

- [ ] Before final create, check if `doctype_key` already exists.
- [ ] Check if workspace item key already exists in selected workspace.
- [ ] Check duplicate fieldnames client-side.
- [ ] Show friendly validation errors before submit.
- [ ] Validate generated route is unique enough or warn if it conflicts.
- [ ] Normalize labels into lowercase snake_case keys consistently.
- [ ] Prevent uppercase custom DocType keys like `Supplier`.

---

# D. Transaction Safety

Current frontend bundle insert may partially create metadata if one insert fails.

Tasks:

- [ ] Prefer a single safe RPC transaction for wizard bundle creation:
  - `public.erp_create_custom_doctype_bundle(...)`
- [ ] The RPC should insert DocType, DocFields, List View, Form Layout, Actions, Workspace Item, and permission catalog entries atomically.
- [ ] If RPC is too large for this phase, implement best-effort cleanup and clearly document the limitation.
- [ ] Do not use service-role in frontend.
- [ ] Do not allow physical table creation.
- [ ] Only allow `generic_json` storage for wizard-created DocTypes.

---

# E. Sidebar Refresh / Open Created DocType

Tasks:

- [ ] After successful wizard creation, refresh workspace navigation without requiring browser reload if practical.
- [ ] Add an `Open Created DocType` button.
- [ ] If live refresh is not practical, show exact instruction: `Refresh the page, then open Workspace → Item`.
- [ ] Final success state should show:
  - DocType created
  - Fields created
  - List View created
  - Form Layout created
  - Actions created
  - Permissions created/granted
  - Workspace Item created
  - Ready to create records

---

# F. Real UI Verification

CLI-AI must verify in the running app using an authenticated user session connected to Supabase Cloud.

Manual flow to verify:

- [ ] Open Metadata Studio
- [ ] Click Create Custom DocType
- [ ] Create a test DocType like `supplier_ui_test`
- [ ] Add fields:
  - `supplier_code` Data required list view
  - `supplier_name` Data required list view
  - `phone` Data list view
  - `email` Data
  - `is_active` Check list view
- [ ] Add it to an active workspace
- [ ] Confirm it appears in sidebar after refresh/open action
- [ ] Open it
- [ ] Create first record
- [ ] Confirm list displays record
- [ ] Edit record
- [ ] Deactivate record
- [ ] Record all results in AI run report

---

# G. Simulation Test

Update or create:

- [ ] `tests/simulations/custom_doctype_wizard_hardening_flow.sql`

Simulation must verify:

- [ ] Custom DocType bundle creation path
- [ ] Permission keys created
- [ ] Permission keys granted to owner/admin or equivalent role
- [ ] Duplicate DocType key is rejected
- [ ] Duplicate workspace item key is rejected
- [ ] Required-field validation works
- [ ] Unknown-field validation works
- [ ] Generic document CRUD works where auth context allows
- [ ] Rollback or cleanup at end

Update:

- [ ] `scripts/run-simulation.cjs`

---

# H. UI Review Requirements

CLI-AI must review and report:

- [ ] Wizard is not too large or marketing-like
- [ ] Each step has helper text
- [ ] Permission step is understandable
- [ ] Success screen gives clear next action
- [ ] Error messages are helpful
- [ ] Advanced metadata tables remain secondary
- [ ] Sidebar remains compact
- [ ] DynamicListPage empty states are clear

---

# I. Verification Commands

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
- [ ] Run hardening simulation on Supabase Cloud
- [ ] Record PASS/FAIL in `progress.md`
- [ ] Add detailed report in `docs/ai-runs/`

---

# J. AI Run Report

Create:

- [ ] `docs/ai-runs/2026-05-30_phase-2-10-custom-doctype-wizard-hardening.md`

Must include:

- [ ] Goal
- [ ] Branch/final commit
- [ ] Files inspected
- [ ] Files created
- [ ] Files modified
- [ ] Supabase Cloud changes
- [ ] Simulation results
- [ ] Real UI verification
- [ ] UI review
- [ ] Command results
- [ ] Known gaps
- [ ] Next task

---

# K. Out Of Scope

Do not implement in this phase:

- [ ] Warehouse CRUD
- [ ] GRN
- [ ] Stock Ledger
- [ ] Physical table creation from UI
- [ ] Generic storage for stock-changing transactional DocTypes
- [ ] Workflow transition engine
- [ ] Naming series generation engine

---

# L. Acceptance Criteria

Phase 2.10 is complete only when:

- [ ] Wizard checks duplicates before create
- [ ] Wizard handles permissions clearly and safely
- [ ] Created custom DocType appears in sidebar or provides one-click/open instruction
- [ ] Created custom DocType can create/list/edit/deactivate a real record in authenticated UI
- [ ] Metadata bundle creation is transaction-safe or limitation is documented
- [ ] Supabase Cloud simulation passes
- [ ] Real UI verification is documented
- [ ] Build/typecheck/lint/test results are documented
- [ ] Detailed AI run report exists under `docs/ai-runs/`

Only after Phase 2.10 should Warehouse Phase 3 begin.
