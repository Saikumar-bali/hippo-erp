# Remaining Frappe-Level Platform Gap Roadmap

Branch: `phase-2.5-metadata-engine`

## Current reality

Hippo ERP now has a working metadata engine foundation, Metadata Studio builders, GRN transaction flow, CRM metadata-first module, and generic document CRUD.

But it is not yet close to Frappe/ERPNext platform completeness. The next work must focus on platform capabilities, not only business modules.

## Major missing platform areas

### 1. Role Permission Manager

Needed features:

- Role management per company
- Role assignment to users per company
- Permission matrix per DocType
- Permission types: read, create, update/write, delete, submit, cancel, amend, report, export, import, print, email, share
- Permission levels for sensitive fields
- User permissions / record-level restrictions
- Page/report permissions
- Role preview / impersonation simulator
- Permission diagnostics

### 2. Company Branding / Theme Studio

Needed features:

- Company logo
- Company favicon
- Primary/accent colors
- Sidebar/topbar theme
- Login/portal branding later
- Print header/footer branding
- Company-scoped CSS variables
- Safe custom CSS rules with validation

### 3. Print Format Builder

Needed features:

- Standard print view from form layout
- Print format records per DocType/company
- Header/footer templates
- Logo and address blocks
- HTML template editor
- Safe CSS for print formats
- PDF generation later
- Print permission enforcement

### 4. Export / Import

Needed features:

- CSV/XLSX export from list views
- Export permission enforcement
- Select visible/all columns
- Filtered export
- CSV import templates
- Import validation preview
- Import error report

### 5. Client Script / Dynamic Form Behavior

Needed features:

- Client script records per DocType/company
- Events: onload, refresh, validate, field change
- Sandboxed script runtime
- Script enable/disable
- Script validation and error reporting
- Safe allowlist of APIs

### 6. Report Builder

Needed features:

- Query/report metadata
- Saved filters
- Chart/card reports
- Permission-controlled reports
- Export/print report results

### 7. Workflow / Docstatus

Needed features:

- Draft/submitted/cancelled document status model
- Workflow states
- Role-based transitions
- Approval actions
- Audit trail
- Amendment flow

### 8. Audit Trail / Versions

Needed features:

- Document created/updated/deleted history
- Field-level diff
- Version timeline
- User/action/time tracking
- Restore support for non-transactional generic docs

### 9. Notifications / Assignments

Needed features:

- Assign document to user
- Follow-up reminders
- Email notification templates
- In-app notifications
- SLA rules later

### 10. App Export / Migration Builder

Needed features:

- Export custom DocTypes/builders to migration SQL or JSON bundle
- Import bundle into another tenant/project
- Version metadata changes
- Publish/unpublish app package

## Recommended phase order

### Phase 6.0 — Role Permission Manager

This must come next because all later features depend on correct role and permission behavior.

### Phase 6.1 — Company Branding / Theme Studio

Needed for company logos, colors, and safe company-specific styling.

### Phase 6.2 — Export / Import Foundation

Needed for practical ERP usage and role-protected data movement.

### Phase 6.3 — Print Format Foundation

Needed for invoices, GRNs, CRM records, PDFs, and company letterheads.

### Phase 6.4 — Client Script Foundation

Needed for dynamic form behavior similar to Frappe Client Script, but must be sandboxed carefully.

### Phase 6.5 — Report Builder Foundation

Needed for operational views beyond simple list pages.

### Phase 6.6 — Workflow / Docstatus Foundation

Needed before serious transactional modules such as Purchase Orders, Sales Orders, Purchase Invoices, and approvals.

### Phase 7.0 — Purchase Order Architecture

Purchase Orders should wait until role permissions, print/export, and workflow boundaries are stronger.

## Key principle

Metadata-driven modules can move fast, but platform safety must come first.

Do not add many business modules before access control, exports, prints, branding, and workflow foundations are reliable.
