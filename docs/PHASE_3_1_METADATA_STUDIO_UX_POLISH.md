# Phase 3.1: Metadata Studio UX Polish

Goal: Improve Metadata Studio raw metadata management screens so they are searchable, grouped, readable, and professional.

## Requirements Checklist

### 1. MetadataDataTable Improvements
- [x] Search input across visible columns
- [x] Row count after filtering
- [x] Compact empty state
- [x] Sticky table header
- [x] Better JSON previews:
  - arrays show “N items”
  - objects show “{...}”
- [x] Better action column spacing
- [x] Keep compact enterprise density

### 2. WorkspaceItemsManager Enhancements
- [x] Group rows by workspace_key
- [x] Show item count per workspace
- [x] Search by label, item_key, target, permission
- [x] Filter by workspace
- [x] Filter by item_type
- [x] Filter by active status
- [x] Show item_type as badge
- [x] Show is_active as badge
- [x] Dim inactive items
- [x] Compact Edit/Delete actions

### 3. MetadataStudioHome Polish
- [x] Create Custom DocType as primary action
- [x] Raw metadata tables under “Advanced Metadata Tables”
- [x] Helper text: “Use builders/wizards for normal work. Use raw tables only for advanced fixes.”
- [x] Quick cards: DocTypes, Workspaces, Workspace Items, List Views, Form Layouts

### 4. MetadataFormDialog Polish
- [x] Monospace label/helper: “Valid JSON required”
- [x] Dialog responsive width

## Implementation Plan

### Step 1: MetadataDataTable
- Add a search state and filter logic in `MetadataDataTable`.
- Render a search input in the toolbar.
- Update table styles for sticky header.
- Implement a helper function for JSON previews.

### Step 2: WorkspaceItemsManager
- Refactor the component to use grouped rendering.
- Add filter states and a filter bar.
- Update row rendering to include badges and dimming for inactive items.

### Step 3: MetadataStudioHome
- Reorganize the dashboard layout.
- Add helper text and quick navigation cards.

### Step 4: MetadataFormDialog
- Update styles for better readability and responsiveness.

### Step 5: Verification
- Run full verification suite (lint, typecheck, tests, build).
- Manual browser verification (simulation/screenshots).
