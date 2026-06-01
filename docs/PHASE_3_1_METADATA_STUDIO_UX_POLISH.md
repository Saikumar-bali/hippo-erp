# Phase 3.1: Metadata Studio UX Polish

## Goal
Improve the Metadata Studio user experience with better data tables, dedicated Workspace Items management, and clear navigation between metadata configuration sub-sections.

## Scope
- **MetadataDataTable** — search, sticky header, JSON inline preview/editing, filtered row count, compact empty states
- **WorkspaceItemsView** — dedicated grouped view with workspace_key grouping, item_type/active badges, multi-filter UI, search, grouped row counts
- **MetadataStudioHome** — "Create Custom DocType" primary action button, "Advanced Metadata Tables" section with descriptive helper text for debugging
- **MetadataFormDialog** — JSON textarea with formatting, invalid-JSON error display, responsive dialog sizing
- **Bug fixes** — Metadata Studio sub-menu navigation (itemKey routing), DELETE grant for `app` schema tables, `createRecord` vs `updateRecord` wiring for new workspace items

## Non-Goals
- No GRN
- No Stock Ledger
- No stock quantity calculations
- No inventory valuation
- No stock transfers/adjustments/reservations
- No warehouse hierarchy changes (Phase 3 only)

## Component Changes

### MetadataDataTable
- Search input with `Search` icon, filters across all visible columns via `columns.some()`
- Row count display: `N / M records`
- Sticky `<thead>` with `position: sticky; top: 0` + explicit background on `<th>`
- `JsonPreviewModal` — click dotted-underline JSON values to open formatted textarea, parse-on-save with "Invalid JSON — check syntax" error
- Empty states: distinct "no records" (with helper text) vs "no search match" (shows query)
- `formatDisplayValue`: arrays → `"N items"`, objects → `"{...}"`, booleans → `"Yes"/"No"`, long strings truncated at 80 chars

### WorkspaceItemsView
- Groups rows by `workspace_key` with section headers showing `{key} (N items)`
- `badgeStyle` helper: teal background for item_type, green/red for is_active
- Three dropdown filters: workspace_key (live from `loadWorkspaceKeys()`), item_type (derived from data), active status (All/Active/Inactive)
- Search across `workspace_key`, `item_key`, `label`, `target`, `required_permission_key`
- Monospace font for `target` and `required_permission_key` columns
- Summary line: `N / M records · X workspaces`
- Styled delete confirmation modal with "This action can be undone" text
- Toast notification on delete with Undo button (via `sonner`)

### MetadataStudioHome
- "Create Custom DocType" button: full-width, primary color, `PlusCircle` icon — launches `CustomDocTypeWizard`
- "Advanced Metadata Tables" section header with helper text: "Raw table inspection for debugging. Use the wizard above for creating new DocTypes."
- 9 sub-section grid buttons with Lucide icons and descriptions (DocTypes, DocFields, Workspaces, Workspace Items, List Views, Form Layouts, DocType Actions, Naming Series, Workflows)

### MetadataFormDialog
- `type === "json"` fields render as `<textarea>` with monospace font, vertical resize
- `toJsonEditorValue` formats initial value with `JSON.stringify(val, null, 2)`
- `normalizeValuesForSave` parses JSON on save, throws descriptive error for invalid JSON
- Dialog uses `maxHeight: "82vh"` + `overflowY: "auto"` for responsive sizing

## Bug Fixes

### Navigation Key Bug
`MetadataStudioRouter` in `DynamicRouteRenderer.tsx` used `useState` initialized from `itemKey` — React reused the component instance when sidebar items changed, so `subPage` never updated. Fixed by adding `key={itemKey}` to force remount.

### Create vs Update Wiring
`WorkspaceItemsView` called `updateRecord` for new records, sending PATCH with `id=eq.undefined`. Fixed by importing and using `createRecord` (POST) for create mode.

### Missing DELETE Grant
Migration 0002 granted `select, insert, update` on `app` schema tables but omitted `delete`. Added `0029_metadata_delete_grant.sql` with `grant delete on all tables in schema app to authenticated` and matching `alter default privileges`.

## Verification

```bash
npm run typecheck    # 0 errors
npm run lint         # 0 errors, 31 warnings (pre-existing)
npm run test         # 31 pass, 6 fail (pre-existing)
npm run build        # Success
npm run test:simulation  # 10 simulation files ready
```

## Known Gaps
1. **MetadataDataTable delete** still uses `window.confirm` (not upgraded to styled modal) — only WorkspaceItemsView has the styled confirm
2. **JsonPreviewModal** has save error handling but no syntax highlighting or tree view
3. **Browser verification** requires manual testing — screenshots captured locally if available
4. **DELETE grant Migration 0029** must be applied to Supabase Cloud separately if not yet run
