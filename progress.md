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
- Metadata-driven ERP core.
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
| 1 | Company profile, users, custom roles, permissions, ERP foundation | Complete | ERP module | Company profile, roles, permissions, user-role assignment, and ERP foundation are in place. |
| 2 | Product master data | Complete | ERP module | Categories, UOM, products/SKUs, barcode/QR, reorder data, batch/expiry flags, RPC-based RLS, PermissionGuard UI. |
| 2.5 | Metadata-Driven ERP Core | Active / verification pending | ERP module | Metadata schema, Product Master metadata seed, frontend metadata loader, and dynamic renderer prototype exist. Migration was corrected for valid RLS write-block syntax and idempotent policy creation. Warehouse must stay deferred until this phase passes verification. |
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
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run test:simulation` scripts are present in `package.json`.
- `setup and flow.pdf` has been reviewed.
- `inventory_management_schema.docx` has been reviewed.
- Company-level ERP flow has been separated from platform-owned onboarding/auth work.
- Frappe-style ERP direction is documented as a Supabase implementation pattern.
- Company permission catalog and default role-permission matrix are seeded in Supabase.
- Role management UI exists with custom role CRUD, grouped permission matrix, and safe delete behavior.
- Company user-role assignment UI exists with company-scoped assignment RPCs and effective permission display.
- Frontend permission guards exist for module entry, screen gating, and action-level restriction handling.
- Signup is treated as demo/testing only; real company access is admin-provisioned through company membership and role assignment.
- Admin in-app invite flow exists via the `invite-company-user` Supabase Edge Function.
- A shared ERP module registry exists in `src/lib/erp-modules.ts`.
- Shared document lifecycle/action constants exist in `src/lib/document-status.ts`.
- Phase 2 Product Master Data is complete.
- Phase 2.5 Metadata-Driven ERP Core is introduced:
  - `app.erp_*` metadata tables are defined in `supabase/migrations/0020_metadata_engine_core.sql`.
  - Product Master metadata is seeded for `product_category`, `unit_of_measure`, and `product`.
  - Metadata loader files exist under `src/lib/metadata/`.
  - Dynamic renderer prototype files exist under `src/components/metadata/`.
  - `MetadataPrototype` is wired into `App.tsx` through the static module registry.
- `tests/simulations/metadata_engine_flow.sql` has been added for metadata engine verification.
- `scripts/run-simulation.cjs` now includes the metadata engine simulation file.

## Important Phase 2.5 Fixes

- The metadata migration previously used invalid PostgreSQL RLS syntax for insert policies. It has been corrected to use `FOR INSERT WITH CHECK (false)`.
- Update policies now use `USING (false) WITH CHECK (false)`.
- Delete policies now use `USING (false)`.
- RLS policies now use unique policy names and `drop policy if exists` before creation, making the migration safer to re-run in development.
- `app.erp_list_views` now has `unique (doctype_key, view_key)` to support idempotent list-view seeds.
- `app.erp_form_layouts` now has `unique (doctype_key, layout_key)` to support idempotent form-layout seeds.

## Current Problems / Pending Verification

### Platform/Auth Problems Handled By Colleague

- Auth provider setup and final production URL settings are platform-owned.
- Base company onboarding/membership mapping is platform-owned.
- Invite acceptance flow is platform-owned.
- Any global SaaS/platform setup is platform-owned.

### ERP Module Problems

- Inventory modules are incomplete.
- UI still contains or may contain user-facing "tenant" wording that should be changed to "Company".
- Warehouse, GRN, inventory, transfer, adjustment, cycle count, reservation, reorder, valuation, and dashboard modules are still pending.
- Phase 2.5 is not complete until local/CI commands are run and documented.
- Metadata migration must be applied in a safe Supabase branch/database and verified.
- `tests/simulations/metadata_engine_flow.sql` must be manually executed in Supabase SQL Editor.
- Existing Product Master screens and the Metadata Prototype need manual UI smoke testing after migration.
- Generic document write APIs are intentionally not implemented yet.

## Required Verification Commands

Run locally or in CI:

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Run manually in Supabase SQL Editor against a safe non-production branch/database:

1. `tests/simulations/company_profile_flow.sql`
2. `tests/simulations/product_master_flow.sql`
3. `tests/simulations/metadata_engine_flow.sql`

## Next Recommendation

Do not start Warehouse yet.

Finish Phase 2.5 verification first. Then stabilize the metadata prototype and migrate Product Master further toward metadata-driven rendering. Only after that should Warehouse metadata design begin.

## Completion Principle

Each phase must be completed and verified before moving to the next phase.

When `tasks.md` is complete, GPT-5.5 verifies the work. If accepted, GPT-5.5 replaces `tasks.md` with the next phase task list.
