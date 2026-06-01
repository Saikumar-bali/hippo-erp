# Phase 4.7 Tasks: Metadata Studio Manual App Builder + Permission Repair

Active branch: `phase-2.5-metadata-engine`

Goal: Make it easy to complete a manually-created menu item from the browser without guessing metadata rows. Users should be able to create a DocType/menu item, diagnose what is missing, repair permissions, and understand whether the screen should be generic metadata-driven or custom transactional UI.

## Why This Phase Exists

The user created a `purchase_invoice` menu item manually under Purchasing and hit permission errors. This is not just user error; it exposes a real Developer Side UX gap.

Today, a working manual DocType requires many separate metadata pieces:

1. DocType
2. DocFields
3. List View
4. Form Layout
5. DocType Actions
6. Permission catalog keys
7. Role/company grants
8. Workspace Item
9. Correct storage strategy
10. Correct route/API type

If any one piece is missing, the page may appear in the menu but fail with permission errors or incomplete rendering.

Phase 4.7 should add a guided repair/checklist experience so users do not have to debug raw metadata manually.

---

# A. Review And Docs

- [x] GPT review report: `docs/ai-runs/2026-06-01_gpt-review-phase-4-6-cancellation.md`
- [ ] Update `docs/ai-runs/2026-06-01_phase-4-6-grn-cancellation-reversal.md` with final commit hash `c2aa2ee4ce641cc58702bb3dc0b7e63ffb51ef44`
- [ ] Update `progress.md` with final Phase 4.6 commit hash
- [ ] Create `docs/PHASE_4_7_MANUAL_APP_BUILDER_PERMISSION_REPAIR.md`
- [ ] Create AI run report: `docs/ai-runs/2026-06-01_phase-4-7-manual-app-builder-permission-repair.md`

---

# B. Build A DocType Completion Checklist

Create a component:

- [ ] `src/components/metadata-studio/DocTypeCompletionChecklist.tsx`

The checklist must accept a `doctype_key` and show:

- [ ] DocType exists
- [ ] Storage strategy set (`generic_json` or `physical_rpc`)
- [ ] At least one visible DocField exists
- [ ] At least one required/title field exists
- [ ] List View exists and has valid `columns_json`
- [ ] Form Layout exists and includes fields
- [ ] DocType Actions exist for read/create/update/deactivate
- [ ] Permission keys exist in permission catalog
- [ ] Permission grants exist for owner/admin
- [ ] Workspace Item exists
- [ ] Workspace Item is active
- [ ] Workspace Item target matches `doctype_key`
- [ ] Route/API can resolve

Show each item as:

```text
PASS / WARNING / ERROR
```

Include a short fix message for each failed item.

---

# C. Add Repair Actions

Where safe, add one-click repair buttons:

- [ ] Create missing default actions
- [ ] Create missing permissions
- [ ] Grant permissions to owner/admin
- [ ] Create default list view from fields marked `in_list_view`
- [ ] Create default form layout from visible fields
- [ ] Activate workspace item
- [ ] Fix workspace item target to match DocType

Do not silently create broad permissions for normal users.

Repair actions must be explicit and show what will change before applying.

---

# D. Add Completion Flow To Metadata Studio

Update:

- [ ] `src/components/metadata-studio/MetadataStudioHome.tsx`
- [ ] `src/components/metadata-studio/DocTypeList.tsx` or relevant DocType management component

Add:

- [ ] `Check / Repair DocType` action
- [ ] selector to choose a DocType
- [ ] show checklist and repair actions
- [ ] explain: “Menu item visible does not mean the DocType is complete.”

---

# E. Purchase Invoice Manual Example Guide

Create a user-facing doc:

- [ ] `docs/MANUAL_DOCTYPE_CREATION_GUIDE.md`

Include a full browser form-filling example for a simple `Purchase Invoice` as a **generic_json demo**, not real accounting ledger.

Important warning:

- [ ] A real Purchase Invoice is a transaction document and should eventually use explicit RPCs.
- [ ] The generic_json Purchase Invoice demo is only for learning/manual app creation.

Example metadata:

## DocType

- Label: `Purchase Invoice`
- Key: `purchase_invoice`
- Module: `purchasing`
- Storage Strategy: `generic_json`
- Company Scoped: true

## Fields

- `invoice_number` Data required list/filter
- `supplier_name` Data required list/filter
- `invoice_date` Date required list/filter
- `due_date` Date
- `total_amount` Float required list
- `status` Select list/filter with Draft, Submitted, Cancelled
- `notes` Text
- `is_active` Check list/filter default true

## List View columns

- Invoice Number
- Supplier Name
- Invoice Date
- Total Amount
- Status
- Active

## Actions

- read → `view_purchase_invoice`
- create → `create_purchase_invoice`
- update → `update_purchase_invoice`
- deactivate → `delete_purchase_invoice`

## Workspace Item

- Workspace: Purchasing
- Label: Purchase Invoices
- Item Type: doctype
- Target: purchase_invoice
- Required Permission: view_purchase_invoice
- Active: true

---

# F. Permission Error UX

Improve user-facing permission errors in dynamic pages.

Update if needed:

- [ ] `src/components/metadata/DynamicListPage.tsx`
- [ ] `src/components/metadata/DynamicRouteRenderer.tsx`
- [ ] `src/components/metadata/DynamicActionBar.tsx`

If a user sees a menu item but lacks permission, show:

```text
Permission required: view_purchase_invoice
Open Metadata Studio → Check / Repair DocType → purchase_invoice
```

Do not show only a raw backend error.

---

# G. CRM Feasibility Documentation

Create:

- [ ] `docs/CRM_ON_METADATA_ENGINE.md`

Explain clearly:

- [ ] CRM master/simple records can be built with metadata/generic_json:
  - Lead
  - Contact
  - Account
  - Opportunity basic tracking
  - Follow-up Task simple records
- [ ] CRM process-heavy features need explicit services later:
  - email sync
  - call logs integrations
  - lead scoring automation
  - pipeline forecast calculations
  - workflow automation
- [ ] GRN is custom/static because it changes inventory quantity.
- [ ] CRM can start as metadata-driven because most CRM entities are normal document records.

---

# H. Simulation / Verification

Add or update simulation if practical:

- [ ] `tests/simulations/manual_doctype_completion_flow.sql`

Verify:

- [ ] create incomplete purchase_invoice metadata
- [ ] detect missing pieces
- [ ] repair permissions/list/form/actions/workspace item
- [ ] generic_json CRUD works after repair
- [ ] cleanup/rollback

If SQL simulation is too large, document browser-only verification.

---

# I. Browser Verification

Verify in browser:

- [ ] Create or use incomplete `purchase_invoice`
- [ ] Run Check / Repair DocType
- [ ] Apply repairs
- [ ] Confirm menu item opens
- [ ] Confirm list columns appear
- [ ] Create one Purchase Invoice demo record
- [ ] Edit it
- [ ] Deactivate it
- [ ] Confirm no permission error remains for owner/admin

Screenshots should be committed if practical under:

```text
docs/ai-runs/screenshots/phase-4-7-manual-builder/
```

---

# J. Tests And Commands

Run and document exact output:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Document known pre-existing failures separately.

---

# K. Acceptance Criteria

Phase 4.7 is complete only when:

- [ ] DocType completion checklist exists
- [ ] permission/list/form/action/workspace repair actions exist where safe
- [ ] Purchase Invoice manual guide exists
- [ ] permission error UX gives useful repair instructions
- [ ] CRM feasibility doc exists
- [ ] browser verification shows manual purchase_invoice works after repair
- [ ] AI run report exists

After Phase 4.7, decide between:

- Phase 5: Purchase Orders
- Phase 5 alternative: CRM module metadata-first proof of concept
- Phase 4.8: GRN numbering/QC polish
