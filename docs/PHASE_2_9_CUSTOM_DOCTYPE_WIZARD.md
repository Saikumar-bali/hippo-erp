# Phase 2.9: Custom DocType Wizard UX

## Problem: Raw DocType Creation Is Not Enough

Creating a single row in `app.erp_doctypes` from Metadata Studio's raw table view does not produce a working ERP DocType. A DocType alone is metadata with no attached configuration — the ERP engine ignores it.

A **working custom DocType** requires all of the following metadata rows:

| # | Metadata Table | Purpose |
|---|---------------|---------|
| 1 | `app.erp_doctypes` | DocType definition (label, storage strategy, module, route) |
| 2 | `app.erp_docfields` | Field definitions (fieldname, fieldtype, validation flags) |
| 3 | `app.erp_list_views` | List view columns, filters, search fields, sort |
| 4 | `app.erp_form_layouts` | Form section layout (which fields appear on create/edit forms) |
| 5 | `app.erp_doctype_actions` | Action-to-permission mapping (read, create, update, deactivate) |
| 6 | `app.erp_workspace_items` | Sidebar navigation entry linking DocType to a workspace |

Without all six, the DocType will:
- Not appear in any workspace sidebar
- Have no visible fields in the list view
- Have no form to create/edit records
- Have no permission checks
- Not be accessible via the generic JSON document API

## Required Metadata Checklist

Before a custom `generic_json` DocType is functional, the system must insert:

1. **DocType** — `doctype_key`, `label`, `module_key`, `route`, `storage_strategy = 'generic_json'`, `is_company_scoped`
2. **DocFields** — at least one field (name/title), with `fieldname`, `fieldtype`, `is_required`, `in_list_view`, `sort_order`
3. **List View** — `columns_json` array of visible columns, `search_fields_json` for text search
4. **Form Layout** — `sections_json` with a default section containing all non-hidden fields
5. **DocType Actions** — 4 actions: `read`, `create`, `update`, `deactivate` each mapped to a `permission_key`
6. **Workspace Item** — navigation entry with `workspace_key`, `item_type = 'doctype'`, `target = doctype_key`, `required_permission_key`

## Wizard Steps

The wizard builds each metadata set in logical order:

```
Step 1: Basic Info      →  DocType row
Step 2: Fields          →  DocField rows
Step 3: List View       →  List View row
Step 4: Form Layout     →  Form Layout row
Step 5: Actions         →  DocType Action rows
Step 6: Workspace       →  Workspace Item row
Step 7: Preview & Create → All inserts in Supabase Cloud
```

Each step validates input before advancing. Step 7 shows a complete summary and performs all inserts in a single flow.

## UI/UX Standards

- **Primary action**: "Create Custom DocType" button on Metadata Studio home
- **Raw tables**: Moved under "Advanced Metadata Tables" section with explanation that they are for inspection only
- **Wizard layout**: Step indicator bar, content area, back/next/create buttons
- **Validation**: Inline field validation with error messages
- **States**: Loading spinner during create, success page after creation, error state with retry
- **Auto-generation**: `doctype_key` auto-generated from label (lowercase snake_case), `fieldname` auto-generated from field label
- **Success**: Shows message "Custom DocType created. It will appear under selected workspace." with next action hint

## Supabase Cloud Verification

- All metadata inserts go directly to `app.erp_*` tables via `metadata-studio-api.ts` 
- No migration needed — metadata tables already exist from migrations 0020–0026
- Verification via simulation SQL that creates a `supplier_test` DocType end-to-end
- Verify list/create documents through `erp_list_documents` / `erp_create_document` RPCs
- Rollback simulation drops test metadata

## Validation Rules

| Field | Rule |
|-------|------|
| `doctype_key` | Lowercase snake_case only |
| `fieldname` | Lowercase snake_case only |
| Field names | No duplicates allowed |
| Required fields | At least one field must have `is_required = true` |
| List columns | At least one column must be in list view |
| Workspace target | Must equal `doctype_key` |
| Storage strategy | Must be `generic_json` for custom DocTypes |
| Module | Must be a valid existing module from `app.erp_modules` |
| Workspace | Must be a valid existing workspace from `app.erp_workspaces` |

## Out of Scope

- Physical table creation from UI (migration-only)
- Warehouse or stock-changing transactions
- Workflow configuration
- Naming series auto-generation
- RLS weakening
