# Phase 6.3: Print Format Foundation

## Status
**Status:** Complete
**Branch:** `phase-2.5-metadata-engine`

## Goals
- Add a safe, metadata-driven Print Format foundation for metadata-driven DocTypes.
- Support declarative layout definitions (sections, fields) without arbitrary JS/HTML.
- Integrate Print button into `DynamicDetailPage` gated by permissions.
- Provide a high-fidelity Print Preview screen.
- Seed default formats for CRM Lead and CRM Opportunity.

## Design
### Database: `app.erp_print_formats`
Stores tenant-specific or system-default print layouts.
- `id`: UUID
- `tenant_id`: UUID (FK to app.tenants)
- `doctype_key`: Text (FK to app.erp_doctypes)
- `format_key`: Text (e.g., 'standard', 'compact')
- `label`: Text
- `is_default`: Boolean
- `is_active`: Boolean
- `layout_json`: JSONB (Defines sections and fields)
- `header_json`: JSONB (Custom header metadata)
- `footer_json`: JSONB (Custom footer metadata)

### Permissions
- `print_<doctype_key>`: Required to see the Print button and access the preview page.

### Frontend
- `PrintPreviewPage`: Orchestrates loading metadata, data, and format.
- `PrintRenderer`: Pure functional component to render the layout for printing.
- `print-format-api`: API wrappers for CRUD on print formats.

## Verification Checklist

### Database & Permissions
- [x] Migration 0045 created and applied.
- [x] `print_crm_lead` and `print_crm_opportunity` permissions seeded.
- [x] Permissions granted to Owner and Admin roles.

### Frontend Implementation
- [x] `PrintRenderer` correctly handles sections and field mapping.
- [x] `PrintPreviewPage` loads data and applies company branding.
- [x] Print button visible on `DynamicDetailPage` only with proper permission.
- [x] Route `print:<doctype_key>:<document_id>` functional.

### Seed Data
- [x] Default format for `crm_lead` seeded (Lead Details, Qualification, Notes).
- [x] Default format for `crm_opportunity` seeded (Deal Details, Forecast, Notes).

### Browser Verification
- [x] CRM Lead detail shows Print button.
- [x] CRM Lead print preview opens with branding.
- [x] Lead sections visible: Lead Details, Qualification, Notes.
- [x] CRM Opportunity detail shows Print button.
- [x] Opportunity sections visible: Deal Details, Forecast, Notes.
- [x] Browser `window.print()` button functional.
- [x] No page errors during navigation.

## Remaining Gaps
- No PDF generation (deferred to future phase).
- No transaction page support (deferred).
- No advanced CSS customization via UI (deferred).
