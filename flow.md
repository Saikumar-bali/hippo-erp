# Company-Level Inventory ERP Flow

This file defines the corrected scope for the Inventory Management ERP module. It is based on `setup and flow.pdf` and `inventory_management_schema.docx`, with ownership clarified.

## A. Scope Boundary

This project work is the company-level ERP module.

It is not the full SaaS/platform onboarding system. Platform/auth/company onboarding is colleague-owned.

Platform/auth responsibilities owned by colleague:

- Supabase auth provider setup.
- Base platform setup.
- Tenant/company onboarding at platform level.
- Invite acceptance flow.
- Base user-to-company membership mapping.
- Global SaaS/platform setup.
- Deployment/auth callback configuration.

This ERP module starts after:

- A user is authenticated.
- A current company context is available.
- The platform layer has mapped the authenticated user to that current company context.

Terminology rule:

- User-facing documentation and UI should say **Company**, not Tenant.
- Existing backend `tenant_id`, if present, should be treated as internal company/platform context until schema impact is reviewed.
- Inventory reads and writes must always be scoped to the current company context.

## B. Frappe-Style ERP Direction

We are building a Frappe/ERPNext-style ERP experience on Supabase.

We are not installing Frappe, depending on the Frappe backend, or replacing Supabase with Frappe. Frappe/ERPNext is a design inspiration for how ERP records, permissions, workflows, and screens should behave.

Frappe-style means:

- Document/entity based modules.
- Role permissions.
- Workflow/status lifecycle.
- Naming series and business document numbers.
- List, form, detail, and report views.
- Audit/history.
- Backend permission enforcement.

Supabase equivalents:

| Frappe/ERPNext concept | Supabase/React implementation pattern |
| --- | --- |
| DocType | Table/entity/module definition |
| Document | Row/business record |
| Role Permission Manager | Custom role + permission matrix |
| Workflow | Status transitions + approval permissions |
| Naming Series | Company-scoped document numbering through RPC/Edge Function |
| Audit Trail | Audit logs + inventory movements |
| List/Form/Report views | React module screens |
| Server scripts | Supabase Edge Functions or Postgres RPC |

Frontend permission guards are for user experience. Supabase RLS/RPC must protect important backend operations.

The shared ERP module registry now lives in `src/lib/erp-modules.ts` and is intended to drive sidebar and module navigation. Each registry row carries:

- Module key.
- Module label.
- Route convention.
- Icon.
- Required permission.
- Scope: company.
- Status: active or pending.

Shared document conventions now live in `src/lib/document-status.ts`:

- Lifecycle statuses: `draft`, `pending_approval`, `approved`, `posted`, `cancelled`, `rejected`, `in_transit`, `completed`.
- Actions: `create`, `edit`, `submit`, `approve`, `post`, `cancel`, `reject`, `delete`, `export`.
- Standard transactional fields: `id`, `company_id`, `document_number`, `status`, `workflow_state`, `created_by`, `created_at`, `updated_at`, `posted_at`, `cancelled_at`.

## C. Company-Level ERP Flow

Main flow:

Company Setup
-> Users, Roles, Permissions
-> ERP Module Registry / Document Conventions
-> Product Master
-> Warehouse Hierarchy
-> GRN / QC / Batch / Bin Allocation
-> Stock Snapshot + Movement Ledger
-> Transfers / Adjustments / Cycle Counts
-> Reservations / Reorder / Valuation
-> Dashboard / Reports

## D. Company And Role Management

### Company Profile

Required company profile fields:

- Company name.
- Company code.
- GST number.
- Email.
- Phone.
- Address.
- Logo.
- Industry type.
- Currency.
- Financial year start.

### Roles And Permissions

The ERP module supports company-level custom roles.

Required capabilities:

- Create custom roles.
- Edit custom roles.
- Delete roles only when safe.
- Assign module-wise permissions.
- Assign roles to users within the current company.
- Show effective permissions.
- Protect routes.
- Protect navigation.
- Protect screens.
- Protect forms.
- Protect buttons.
- Protect approval actions.
- Protect stock-changing actions.

## E. Frappe-Style Document Rules

Every major ERP object should behave like a business document.

Examples:

- Product.
- Warehouse.
- Bin.
- GRN.
- Stock Transfer.
- Stock Adjustment.
- Cycle Count.
- Reservation.
- Reorder Alert.
- Valuation Entry.

Each transactional document should have, where applicable:

- Internal UUID.
- Company context.
- Business document number.
- Owner/created_by.
- Created timestamp.
- Updated timestamp.
- Status.
- Workflow state if approvals are needed.
- Submitted/posted timestamp if applicable.
- Cancelled/rejected timestamp if applicable.
- Audit trail.

Standard lifecycle examples:

General document:

Draft
-> Submitted/Posted
-> Cancelled

Approval document:

Draft
-> Pending Approval
-> Approved
-> Posted
-> Rejected/Cancelled

GRN:

Draft
-> QC Pending
-> QC Approved
-> Posted
-> Cancelled

Stock Adjustment:

Draft
-> Pending Approval
-> Approved
-> Posted
-> Rejected

Stock Transfer:

Draft
-> In Transit
-> Completed
-> Cancelled

## F. Naming Series / Business Document Numbers

Rules:

- Users should not normally see or type raw UUIDs.
- Internal UUIDs can stay in the database.
- UI should display company-scoped business document numbers.
- Naming must be safe from duplicates.
- Prefer Postgres RPC for document number generation if transaction safety is needed.
- Supabase Edge Functions can orchestrate if extra server logic is needed.

Examples:

- `GRN-2026-00001`
- `ST-2026-00001`
- `ADJ-2026-00001`
- `CC-2026-00001`
- `RES-2026-00001`

The exact implementation can come later, but the convention must be documented before Product, GRN, and Stock modules are built. Prefer Postgres RPC for transaction-safe numbering; use an Edge Function only when orchestration beyond the database is required.

## G. Inventory Domains

### Product Domain

Purpose: maintain product master data.

Includes:

- Product categories.
- Units of measure.
- Products/SKUs.
- Barcode/QR values.
- Reorder point.
- Batch tracking flag.
- Expiry tracking flag.

### Warehouse Domain

Purpose: maintain physical storage structure.

Hierarchy:

Warehouse
-> Zone
-> Aisle
-> Rack
-> Shelf
-> Bin

Includes:

- Warehouses.
- Warehouse zones.
- Aisles.
- Racks.
- Shelves.
- Bins.

### GRN Domain

Purpose: receive goods and post inventory.

Flow:

Supplier
-> GRN creation
-> GRN line items
-> QC/grading
-> Batch creation
-> Bin allocation
-> Stock posting
-> Movement ledger entry

Includes:

- GRN headers.
- GRN lines.
- QC/grading.
- Batch creation.
- Bin allocation.
- Stock posting.

### Inventory Domain

Purpose: maintain current stock and inventory history.

Includes:

- Inventory batches.
- Inventory stock snapshot.
- Inventory movement ledger.
- Reservations.
- Reorder alerts.
- Inventory valuation.

### Transaction Domain

Purpose: manage stock-changing workflows.

Includes:

- Stock transfers.
- Stock transfer lines.
- Stock adjustments.
- Cycle counts.
- Cycle count lines.

## H. Standard ERP Screens

Each module should eventually support standard ERP screens:

- List view.
- Create form.
- Edit/detail form.
- Status badge.
- Search.
- Filters.
- Sorting.
- Export if permitted.
- Audit/history section if applicable.
- Permission-aware action buttons.

The codebase treats this as a standard screen contract for future modules:

- list view
- create form
- edit/detail form
- report view
- audit/history section

Do not implement all of this in Phase 1. This section documents the convention.

## I. Critical ERP Rules

- Every stock-changing action must create an inventory movement ledger entry.
- `inventory_stock` is the current balance/snapshot.
- `inventory_movements` is the historical ledger/audit trail.
- Available stock = quantity - reserved_quantity.
- Batch/expiry tracked products must support FEFO picking.
- Stock adjustments require approval.
- Cycle count variance must post through the adjustment flow.
- Dashboard must be built after core transaction data exists.
- Users should never type internal IDs/UUIDs in normal ERP screens.
- Company context must be enforced for every inventory read/write.
- Approval actions must be permission protected.
- Frontend permission guards are for UX; Supabase RLS/RPC must protect important writes.

## J. Out Of Scope / Colleague-Owned

The following are platform-owned and should not be overbuilt in this ERP module:

- Tenant creation.
- Tenant membership onboarding.
- Authentication provider setup.
- Invite acceptance flow.
- Base deployment.
- Global SaaS/platform setup.

Do not delete useful platform notes. Reframe them as platform-owned, or as internal company context mapping, instead of exposing them as ERP module work.
