# Metadata-Driven ERP Engine

## Purpose

Hippo ERP is moving from hand-coded React/Supabase screens toward a Frappe-inspired metadata-driven architecture. This document explains the direction, constraints, and mapping between Frappe concepts and Hippo ERP implementations.

## Important Constraints

- **Frappe is inspiration only.** We do not run Frappe, install Frappe, or copy Frappe source code.
- **Supabase remains primary.** Supabase Auth, Postgres, RLS, and RPC are the core backend.
- **Node.js is optional.** A Node.js metadata/document service may be added later if orchestration needs exceed what RPC/Edge Functions can safely handle.
- **Metadata-driven does not mean unsafe writes.** Master data (products, categories, UOM) can use generic metadata CRUD through whitelisted paths. Stock-changing transactions (GRN posting, transfers, adjustments) require explicit controlled services.
- **No dynamic user-created DocTypes in this phase.** Metadata is seeded and managed through migrations. UI-driven DocType creation is a future concern.

## Concept Mapping

| Frappe Concept | Hippo ERP Concept |
|---|---|
| DocType | `app.erp_doctypes` — document/entity metadata definition |
| DocField | `app.erp_docfields` — field metadata with types, validation, display rules |
| DocPerm | `app.erp_doctype_actions` — action-to-permission mapping |
| Document | Row/business record in a company-scoped table |
| Naming Series | `app.erp_naming_series` — company-scoped document numbering |
| Workflow | `app.erp_workflows` + `app.erp_workflow_states` + `app.erp_workflow_transitions` |
| List View | `app.erp_list_views` — column config, filters, search, sort |
| Form Layout | `app.erp_form_layouts` — section-based form/detail layout |
| Server Script / Controller | Supabase RPC / Edge Function / (future) Node service |
| Role Permission Manager | `app.company_role_permissions` + `app.company_role_assignments` |
| Module | `app.erp_modules` — high-level application module |

## Runtime Architecture

```
Frontend (React)
  |
  |-- DynamicListPage     (loads list metadata + fields + permissions)
  |-- DynamicFormPage     (loads form layout + fields + validation)
  |-- DynamicDetailPage   (loads form layout with read-only data)
  |-- DynamicFieldRenderer (renders typed fields from metadata)
  |-- DynamicFilterBar    (renders standard filters from metadata)
  |-- DynamicActionBar    (renders permission-aware actions)
  |
  |-- Metadata Loader     (fetches from Supabase or metadata API)
  |-- DocType Registry    (cached DocType metadata for current session)
  |
  v
Supabase / (future Node Metadata API)
  |
  |-- app.erp_* tables    (metadata configuration)
  |-- wh.* tables          (business data)
  |-- app.* tables         (company/role/permission data)
  |-- SECURITY DEFINER RPC (permission-aware write operations)
  |-- RLS policies         (row-level security)
```

## Security Rules

1. **Metadata reads**: Any authenticated user with company membership can read metadata config.
2. **Metadata writes**: Restricted to platform owners/admins (migration-only in current phase).
3. **Data reads**: Company-scoped, permission-checked via RPC or RLS.
4. **Master data writes**: Whitelisted DocTypes, whitelisted fields, permission-checked.
5. **Stock-changing writes**: Explicit controlled RPC/services only — never generic CRUD.
6. **No service role in frontend.**
7. **No raw table/column writes from arbitrary metadata without whitelist validation.**

## Current Phase Scope

Phase 2.5 seeds metadata for the existing Product Master (products, categories, UOM) and provides dynamic renderer prototypes that run alongside the existing hand-coded screens. This proves the metadata engine works before migrating existing or building new modules.
