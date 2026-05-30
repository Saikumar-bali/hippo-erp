# Project Progress

This file tracks project phases and ownership. Only `tasks.md` contains the active implementation checklist.

## Corrected Ownership

The project goal is a Frappe/ERPNext-style company-level Inventory ERP built on Supabase.

Frappe/ERPNext is a design inspiration only. We are not using Frappe as the backend framework. The technical stack remains React/Vite/TypeScript, Supabase Auth, Supabase Postgres, Supabase RLS, Supabase RPC/Edge Functions where needed, Supabase Storage where needed, and Cloudflare Pages.

The project foundation exists, but the company-level ERP modules are incomplete.

Platform/auth/base setup is colleague-owned:

- Supabase auth provider setup.
- Base platform setup.
- Tenant/company onboarding at platform level.
- Invite acceptance flow.
- Base user-to-company membership mapping.
- Global SaaS/platform setup.
- Deployment/auth callback configuration.

My active ERP responsibility starts after an authenticated user has a current company context:

- Company profile/business context.
- Custom company roles.
- Permission matrix.
- Users mapped to company roles.
- ERP access control.
- Product master.
- Warehouse hierarchy.
- GRN, QC, batch creation, and bin allocation.
- Stock snapshot.
- Inventory movement ledger.
- Stock transfers.
- Stock adjustments.
- Cycle counts.
- Reservations.
- Reorder alerts.
- Valuation.
- Dashboard.
- Reports.

User-facing terminology should say **Company**, not Tenant. If backend code still uses `tenant_id`, treat it as the internal platform/company context until schema impact is reviewed.

## Phase Status

| Phase | Name | Status | Ownership | Notes |
| --- | --- | --- | --- | --- |
| 0 | Project scaffold and deployment foundation | Mostly complete | Platform-owned | React/Vite/Supabase/Cloudflare/GitHub foundation exists. |
| 1 | Company profile, users, custom roles, permissions, ERP foundation | Complete | ERP module | Phase 1 complete. Company profile, roles, permissions, user-role assignment, and ERP foundation are in place. |
| 2 | Product master data | Complete | ERP module | Phase 2 complete + professional polish. Categories, UOM, products/SKUs, barcode/QR, reorder data, batch/expiry flags, RPC-based RLS, PermissionGuard UI. Polish: column renames, TRACKING column, section-grouped detail, search/filter on all lists, professional schema fields (parent_category, symbol, etc.), updated RPCs and forms. |
| 2.5 | Metadata-Driven ERP Core | Active | ERP module | Frappe-style metadata engine introduced. DocType/DocField/DocPerm/List View/Form Layout metadata tables seeded for Product Master. Dynamic renderer prototypes added alongside existing screens. Warehouse should wait until metadata core is stable. |
| 3 | Warehouse hierarchy | On Hold | ERP module | Warehouses, zones, aisles, racks, shelves, bins. Deferred until metadata core is stable. |
| 4 | GRN, QC, batch, bin allocation | Pending | ERP module | Goods receipt, QC/grading, batch creation, bin allocation, stock posting. |
| 5 | Stock snapshot and movement ledger | Pending | ERP module | Current balance, available stock, batch/expiry, FEFO, historical ledger. |
| 6 | Transfers and adjustments | Pending | ERP module | Transfer request/completion, stock corrections, approvals. |
| 7 | Cycle counts | Pending | ERP module | Count scheduling, count lines, variance, adjustment posting. |
| 8 | Reservations | Pending | ERP module | Reserve, release, dispatch/consume. |
| 9 | Reorder alerts and valuation | Pending | ERP module | Low stock alerts, valuation, average/FIFO strategy. |
| 10 | Dashboard and reporting | Pending | ERP module | KPIs, reports, filters, exports. |
| 11 | UI polish | Pending | ERP module | Professional ERP UX across desktop/mobile. |
| 12 | Tests, RLS/security, simulations | Pending | Shared | ERP tests plus platform security coordination. |
| 13 | Production readiness | Pending | Shared | Final smoke tests, deployment proof, documentation. |

## Current Verified Items

- React + Vite + TypeScript project exists.
- Supabase client exists.
- Cloudflare Pages project exists.
- Cloudflare Pages reports Git Provider as `Yes`.
- `npm run typecheck` passes as of 2026-05-28.
- `npm run test:simulation` exists and prints safe SQL execution instructions.
- `setup and flow.pdf` has been reviewed.
- `inventory_management_schema.docx` has been reviewed.
- Company-level ERP flow has been separated from platform-owned onboarding/auth work.
- Frappe-style ERP direction is now documented as a Supabase implementation pattern.
- Company permission catalog and default role-permission matrix are seeded in Supabase.
- Role management UI now exists with custom role CRUD, grouped permission matrix, and safe delete behavior.
- Company user-role assignment UI now exists with company-scoped assignment RPCs and effective permission display.
- Frontend permission guards now exist for module entry, route-like screen gating, and button/action-level restriction handling.
- Signup is treated as demo/testing only; real company access is admin-provisioned through company membership and role assignment.
- Admin in-app invite flow now exists via the `invite-company-user` Supabase Edge Function, which sends the invite email and provisions company membership/role in one step.
- A shared ERP module registry now exists in `src/lib/erp-modules.ts` with module key, label, route, icon, permission, scope, and status metadata.
- Shared document lifecycle/action constants now exist in `src/lib/document-status.ts`.
- Naming-series and standard ERP screen conventions are documented for future Product, GRN, Warehouse, and Stock modules.
- Section G Frappe-style ERP foundation is now implemented and documented.
- Inventory module screens still depend on `wh` schema exposure or RPC-backed read endpoints; until that backend plumbing is added, some future-module menu items will toast a friendly error instead of rendering data.
- Phase 2 Product Master Data is now complete.
- Phase 3 Warehouse Hierarchy is the next implementation phase.

## Current Problems

### A. Platform/Auth Problems Handled By Colleague

- Auth provider setup and final production URL settings are platform-owned.
- Base company onboarding/membership mapping is platform-owned.
- Invite acceptance flow is platform-owned.
- Any global SaaS/platform setup is platform-owned.

### B. My ERP Module Problems

- Frappe-style conventions are implemented and documented; the remaining work is to apply them to future Product/GRN/warehouse/stock entities as those modules are built.
- Approval readiness permissions are defined and documented: `qc_grn`, `approve_grn`, `post_grn`, `approve_adjustment`, `transfer_stock`, and `approve_cycle_count` (new) are all seeded with role grants and documented in ARCHITECTURE.md.
- Inventory modules are incomplete.
- UI still contains or may contain user-facing "tenant" wording that should be changed to "Company".
- Product Master Data is complete.
- Warehouse, GRN, inventory, transfer, adjustment, cycle count, reservation, reorder, valuation, and dashboard modules are still pending.
- Phase 2.5 Metadata-Driven ERP Core is now active. Frappe-style DocType/DocField/List/Form metadata tables have been added. Dynamic renderer prototypes exist alongside existing screens.
- Code-first screens should gradually migrate to metadata-driven renderers as modules are built or refactored.
- Warehouse phase is deferred until metadata core is stable.
- Simulation SQL exists but is not automatically executed against a safe test database.
- Some repo files are currently modified/untracked and need review before commit.

## Completion Principle

Each phase must be completed and verified before moving to the next phase.

When `tasks.md` is complete, GPT-5.5 verifies the work. If accepted, GPT-5.5 replaces `tasks.md` with the next phase task list.
