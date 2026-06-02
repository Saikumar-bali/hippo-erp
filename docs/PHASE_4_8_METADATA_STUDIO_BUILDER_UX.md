# Phase 4.8: Metadata Studio Builder UX

## Goal

Make Metadata Studio builder-first and professional so a developer can create and refine metadata without manually typing internal schema names, field types, list-view JSON, form-layout JSON, or menu targets.

## Scope

This phase is limited to Metadata Studio UX.

- No Purchase Orders implementation
- No CRM implementation
- No new ERP transaction logic
- No new posting, ledger, or inventory behavior

## Builder Screens

Phase 4.8 introduces six dedicated builder surfaces:

1. `DocTypeBuilder`
2. `DocFieldBuilder`
3. `ListViewBuilder`
4. `FormLayoutBuilder`
5. `WorkspaceMenuBuilder`
6. `AccessBuilder`

These screens write into the same metadata tables already used by the renderer:

- `app.erp_doctypes`
- `app.erp_docfields`
- `app.erp_list_views`
- `app.erp_form_layouts`
- `app.erp_workspace_items`
- `app.erp_doctype_actions`
- `app.permissions`
- `app.role_permission_grants`

## UX Decisions

### 1. DocType builder uses guided defaults

- `schema_name` is a dropdown instead of free text
- `storage_strategy` is a dropdown instead of free text
- `generic_json` shows the correct `app.erp_documents` storage preview
- key generation stays snake_case and route stays aligned to the DocType key

### 2. Field builder removes internal-string guessing

- `fieldtype` is a dropdown using the supported renderer types
- `Link` fields use a DocType dropdown for `link_to`
- `Select` fields use a multi-line options editor
- sort order is controlled visually with reorder buttons

### 3. List views are now visual

- users choose columns from existing DocFields
- column label and width are editable without JSON
- search fields and filter fields are checkbox-based
- saved metadata still lands in `columns_json`, `filters_json`, and `search_fields_json`

### 4. Form layouts are now visual

- users add sections, rename sections, and choose one or two columns
- fields are assigned by UI instead of raw `sections_json`
- field ordering is explicit per section
- saved metadata matches renderer expectations: `{ section, columns, fields }[]`

### 5. Workspace targets are dropdown-driven

- DocType items use a DocType target dropdown
- page items use a known-page dropdown
- workspace items can reuse workspace dropdown targets
- read permission is auto-suggested for DocType menu items

### 6. Access setup is handled by UI

- standard `read/create/update/deactivate` action mappings are visible together
- missing permission keys can be created from the builder
- owner/admin grants can be enabled from the builder
- this phase keeps the safe boundary from Phase 4.7 and does not auto-grant broad user access

## Metadata Studio Home Changes

Metadata Studio home is reorganized into:

- `Builder Screens`
- `Advanced Metadata Tables`

The builders are the recommended workflow. Raw tables remain available for diagnostics and advanced edits only.

## Purchase Invoice Demo Positioning

Purchase Invoice in this phase remains a metadata-driven demo DocType for builder verification only.

- It is valid for UI verification and generic CRUD
- It is not a real accounting document
- It should not be treated as posted financial logic

## Verification Targets

Phase 4.8 is accepted when:

- Metadata Studio is builder-first
- schema uses dropdowns
- field type uses dropdowns
- list view can be built without JSON
- form layout can be built without JSON
- menu targets use dropdowns
- access setup works through UI
- Purchase Invoice demo can be created, edited, and deactivated through builder-generated metadata
