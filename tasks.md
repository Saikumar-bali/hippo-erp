# Phase 2.8 Tasks: Custom DocType Document Storage

Active branch: `phase-2.5-metadata-engine`

Goal: Allow Metadata Studio–created custom DocTypes to store and retrieve generic JSON documents through RPC functions, without creating physical database tables.

## Architecture

```
Custom DocType (generic_json)
  └─ erp_documents table (app schema)
       ├─ data (jsonb) — all dynamic fields
       ├─ doctype_key — identifies the DocType
       ├─ company_id — company context
       ├─ is_active — soft-delete
       └─ audit columns (created_by, created_at, updated_at)
  └─ erp_document_versions (app schema) — append-only version history
  └─ RPC functions (public schema) — erp_list_documents, erp_get_document,
     erp_create_document, erp_update_document, erp_deactivate_document,
     erp_reactivate_document
```

Only `manage_metadata` users can create DocTypes. Document access is gated by `erp_doctype_actions` + company role permissions.

---

# A. Planning And Docs

- [x] `docs/PHASE_2_8_CUSTOM_DOCTYPE_STORAGE.md` — architecture design doc

---

# B. Database: Custom DocType Storage

- [x] Migration `0026_custom_doctype_storage.sql`:
  - [x] `storage_strategy` column on `app.erp_doctypes` (default `physical_rpc`)
  - [x] `app.erp_documents` table with RLS policies
  - [x] `app.erp_document_versions` table
  - [x] `public.current_user_has_doctype_permission` helper function
  - [x] 6 RPC functions with field validation, permission check, company scoping
  - [x] Version history writes on create/update
- [x] Applied to Supabase Cloud via Management API
- [x] Verified: `storage_strategy` column, `erp_documents` table, 6 RPC functions, RLS policies all present

---

# C. Frontend: Generic Document API

- [x] `src/lib/metadata/types.ts` — added `storage_strategy` to `DocTypeMeta`
- [x] `src/lib/metadata/generic-doctype-api.ts` — bridge wrapping 6 RPC calls
- [x] `src/components/metadata/doctype-api-map.ts`:
  - [x] `DocTypeApi.get` signature updated with optional `tenantId`
  - [x] `detectAndRegisterGenericDocTypeApi()` — auto-detects `generic_json` doctypes
- [x] `src/components/metadata/DynamicListPage.tsx` — auto-detect generic_json when api is null
- [x] `src/components/metadata/DynamicDetailPage.tsx` — auto-detect + tenantId passthrough
- [x] `src/lib/metadata/metadata-studio-api.ts` — added `storage_strategy` field to DocType form

---

# D. Frontend: Metadata Studio

- [x] `storage_strategy` field in DocType create form (select: physical_rpc / generic_json)
- [ ] Metadata Studio "Create Starter Metadata" helper — wizard for auto-creating module + workspace + doctype + actions + workspace item (can be separate PR)

---

# E. Testing

- [x] `tests/simulations/custom_doctype_storage_flow.sql` — 9 checks
- [x] Simulation run on Supabase Cloud — 9/9 PASS
- [x] `npm run typecheck` — 0 errors (all pre-existing 0 errors)
- [x] `npm run lint` — 0 errors (all pre-existing 29 warnings)
- [x] `npm run build` — success

---

# F. Commit & Push

- [x] Push to `origin/phase-2.5-metadata-engine`
- [x] Update `progress.md` with Phase 2.8 results
