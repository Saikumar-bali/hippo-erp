# Phase 2.7 Tasks: Metadata Studio / Developer Side

Active branch: `phase-2.5-metadata-engine`

Goal: create the Developer Side of the two-sided ERP architecture — a Metadata Studio workspace where authorized developers and platform admins can inspect metadata that drives all ERP screens.

Phase 2.6 proved workspace navigation + compact UI from metadata. Phase 2.7 adds the developer-facing metadata inspection layer.

## Senior Architecture Rule

Do not implement Warehouse, GRN, Stock Ledger, generic write API, or physical table creation in this phase. Metadata Studio is read-only inspection for now.

## Two-Sided Architecture

```
ERP User Side (2.5 + 2.6)      Developer Side (2.7)
─────────────────────────      ─────────────────────────
Product Master                 Metadata Studio
  Products                       DocTypes
  Product Categories             DocFields
  Units of Measure               Workspaces
                                 Workspace Items
                                 List Views
                                 Form Layouts
                                 DocType Actions
                                 Naming Series
                                 Workflows
```

Only users with `manage_metadata` permission see the Metadata Studio workspace.

---

# A. Planning And Docs

Files:

- [x] `docs/PHASE_2_7_METADATA_STUDIO.md`

Tasks:

- [x] Document two-sided architecture (ERP User Side vs Developer Side).
- [x] Explain how DocType metadata drives ERP screens.
- [x] Explain why normal users should not create physical DB tables.
- [x] Explain why Supabase Cloud migrations/seeds must be verified.

---

# B. Database: Metadata Studio Foundation

Migration:

- [x] `supabase/migrations/0023_metadata_studio_foundation.sql`

New permission:

- [x] `manage_metadata` permission seeded to `app.permissions`.
- [x] Granted to `owner` and `admin` roles.
- [x] Added to `create_company_role` for owner/admin auto-grant.

New tables:

- [x] `app.erp_audit_logs` — foundation for tracking metadata changes.
- [x] `app.erp_metadata_change_requests` — foundation for safe metadata edit flow.

Metadata Studio workspace seed:

- [x] `metadata_studio` workspace (active, requires `manage_metadata`).
- [x] DocTypes item → page `metadata_studio_doctypes`.
- [x] DocFields item → page `metadata_studio_docfields`.
- [x] Workspaces item → page `metadata_studio_workspaces`.
- [x] Workspace Items item → page `metadata_studio_workspace_items`.
- [x] List Views item → page `metadata_studio_list_views`.
- [x] Form Layouts item → page `metadata_studio_form_layouts`.
- [x] DocType Actions item → page `metadata_studio_actions`.
- [x] Naming Series item → page `metadata_studio_naming_series`.
- [x] Workflows item → page `metadata_studio_workflows`.

RLS:

- [x] `erp_audit_logs` — authenticated read, no frontend write.
- [x] `erp_metadata_change_requests` — authenticated read, no frontend write.

---

# C. Metadata Studio Frontend

Add files:

- [x] `src/components/metadata-studio/MetadataStudioHome.tsx`
- [x] `src/components/metadata-studio/DocTypeList.tsx`
- [x] `src/components/metadata-studio/DocTypeDetail.tsx`
- [x] `src/components/metadata-studio/DocFieldList.tsx`
- [x] `src/components/metadata-studio/WorkspaceMetadataList.tsx`
- [x] `src/components/metadata-studio/ListViewMetadataList.tsx`
- [x] `src/components/metadata-studio/FormLayoutMetadataList.tsx`

Update:

- [x] `src/components/metadata/DynamicRouteRenderer.tsx` — route Metadata Studio page items.
- [x] `scripts/run-simulation.cjs` — add metadata studio simulation.

---

# D. Simulation Test

Add:

- [x] `tests/simulations/metadata_studio_foundation_flow.sql`

Simulation must verify:

- [x] `manage_metadata` permission exists.
- [x] Metadata Studio workspace exists and is active.
- [x] Metadata Studio workspace items exist (at least 4).
- [x] Audit logs table exists.
- [x] Metadata change requests table exists.
- [x] RLS enabled on audit/change tables.

---

# E. Verification Commands

Run and document exact output in `progress.md`:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

Manual verification:

- [x] Metadata Studio workspace appears for users with `manage_metadata`.
- [x] Metadata Studio hidden for users without `manage_metadata`.
- [x] Each metadata page shows a data table with correct columns.
- [x] Pages are read-only (no edit/create buttons).

---

# F. Supabase Cloud

- [x] Migration 0023 applied to Supabase Cloud.
- [x] Simulation run against Supabase Cloud, all checks PASS.
- [x] Final commit pushed to `phase-2.5-metadata-engine`.

---

# G. Out Of Scope

Do not implement in Phase 2.7:

- Warehouse CRUD.
- GRN or Stock Ledger.
- Generic document write API.
- Physical table creation by users.
- User-created DocType storage (dynamic schema).
- Workflow transition engine.
- Naming series generation engine.
- Metadata Studio edit/create forms (read-only only).
- Breadcrumbs component.

---

# H. Acceptance Criteria

Phase 2.7 is complete only when:

- [x] `manage_metadata` permission exists and is granted to owner/admin.
- [x] Metadata Studio workspace appears in sidebar for authorized users.
- [x] All 9 metadata pages render read-only tables.
- [x] Audit logs and change requests tables exist with RLS.
- [x] Simulation passes all checks.
- [x] Verification commands documented with results.
- [x] All changes applied and verified on Supabase Cloud.
