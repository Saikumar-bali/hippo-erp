# Phase 3.1 Tasks: Metadata Studio UX Polish

Active branch: `phase-2.5-metadata-engine`

Goal: Improve Metadata Studio raw metadata management screens so they are searchable, grouped, readable, and professional before starting GRN or Stock Ledger.

## Why This Phase Exists

Phase 3 Warehouse hierarchy is complete as metadata-driven master data. However, Metadata Studio still feels like a raw database table editor. As the system grows, raw flat tables will become hard to inspect and maintain.

Phase 3.1 improves the Developer Side UX without changing the ERP business model.

---

# A. Planning And Docs

- [x] Add GPT review report: `docs/ai-runs/2026-05-30_gpt-review-phase-3-warehouse-and-ui.md`
- [x] Create `docs/PHASE_3_1_METADATA_STUDIO_UX_POLISH.md`
- [x] Update `progress.md` after implementation

---

# B. MetadataDataTable Improvements

Update:

- [x] `src/components/metadata-studio/MetadataDataTable.tsx`

Add:

- [x] Search input across visible columns
- [x] Row count after filtering
- [x] Compact empty state
- [x] Sticky table header
- [x] Better JSON previews:
  - arrays show `N items`
  - objects show `{...}` or key count
  - strings remain readable
- [x] Tooltip/title with full JSON preview if practical
- [x] Better action column spacing
- [x] Keep compact enterprise density

---

# C. Workspace Items Specialized UI

Create or update:

- [x] `src/components/metadata-studio/WorkspaceItemsManager.tsx`

Requirements:

- [x] Group workspace items by `workspace_key`
- [x] Show item count per workspace
- [x] Search by label, item key, target, permission
- [x] Filter by workspace
- [x] Filter by item type
- [x] Filter by active status
- [x] Show `item_type` as badge
- [x] Show `is_active` as badge
- [x] Show inactive items dimmed
- [x] Keep Edit/Delete actions compact
- [x] Use existing `MetadataFormDialog` for editing where possible

Target display style:

```text
Workspace Items
[Search...] [Workspace: All] [Type: All] [Status: Active]

Metadata Studio (9)
  Supplier UI Tests    DocType   supplier_ui_test   view_supplier_ui_test   Active
  DocTypes             Page      metadata_studio_doctypes manage_metadata    Active

Product Master (3)
  Products             DocType   product            view_products           Active

Warehouse (6)
  Warehouses           DocType   warehouse          view_warehouse          Active
```

---

# D. Metadata Studio Home Polish

Update:

- [x] `src/components/metadata-studio/MetadataStudioHome.tsx`

Requirements:

- [x] `Create Custom DocType` remains primary action
- [x] Raw tables appear under `Advanced Metadata Tables`
- [x] Add helper text:
  - `Use builders/wizards for normal work. Use raw tables only for advanced fixes.`
- [x] Add quick cards:
  - DocTypes
  - Workspaces
  - Workspace Items
  - List Views
  - Form Layouts
- [x] Keep compact layout

---

# E. MetadataFormDialog JSON Editor Polish

Update:

- [x] `src/components/metadata-studio/MetadataFormDialog.tsx`

Already fixed:

- [x] JSON fields render as textarea
- [x] JSON objects/arrays pretty-print
- [x] Invalid JSON shows clear error

Improve further if practical:

- [x] Add monospace label/helper: `Valid JSON required`
- [x] Add examples for JSON fields based on field name if easy
- [x] Make dialog width responsive

---

# F. List View / Form Layout Advanced UX

Do not build full visual builders yet. But improve the raw-table experience:

- [x] JSON previews should not flood table cells
- [x] Edit modal should be readable
- [x] JSON save errors should identify exact field label
- [x] Add note that future Visual List View Builder and Visual Form Layout Builder are planned

---

# G. Screenshot / Browser Verification

CLI-AI must verify with browser automation if available.

Screens to check:

- [x] Metadata Studio home
- [x] Workspace Items grouped view
- [x] Workspace Items filters/search
- [x] List Views table
- [x] List Views edit modal showing formatted JSON
- [x] DocFields table search

Screenshots should be committed if possible under:

```text
docs/ai-runs/screenshots/phase-3-1-metadata-studio-ui/
```

If screenshots are only local, report that explicitly.

---

# H. Verification Commands

Run and document exact output:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

---

# I. AI Run Report

Create:

- [x] `docs/ai-runs/2026-05-30_phase-3-1-metadata-studio-ux-polish.md`


Must include:

- [ ] Goal
- [ ] Branch/final commit
- [ ] Files inspected
- [ ] Files created
- [ ] Files modified
- [ ] UI verification
- [ ] Screenshot paths or local-only note
- [ ] Command results
- [ ] Known gaps
- [ ] Next recommended task

---

# J. Out Of Scope

Do not implement in this phase:

- [ ] GRN
- [ ] Stock Ledger
- [ ] Stock quantity calculations
- [ ] Inventory valuation
- [ ] Stock transfers
- [ ] Stock adjustments
- [ ] Reservations
- [ ] Reorder alerts
- [ ] Workflow engine
- [ ] Naming series engine
- [ ] Visual List View Builder
- [ ] Visual Form Layout Builder

---

# K. Acceptance Criteria

Phase 3.1 is complete only when:

- [ ] Metadata Studio Home clearly prioritizes builders/wizards over raw tables
- [ ] Workspace Items view is grouped and filterable
- [ ] Metadata tables have search and better JSON previews
- [ ] JSON edit modal is readable and validates JSON
- [ ] UI verification is documented
- [ ] Build/typecheck/lint/test results are documented
- [ ] Detailed AI run report exists under `docs/ai-runs/`

After Phase 3.1, proceed to Phase 4 planning: GRN and explicit stock posting architecture.
