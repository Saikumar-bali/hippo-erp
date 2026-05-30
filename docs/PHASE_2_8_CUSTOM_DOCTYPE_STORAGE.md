# Phase 2.8: Generic Custom DocType Document Storage

## Problem

Creating a DocType row in `app.erp_doctypes` from Metadata Studio does not make it usable in the ERP menu. The DocType also needs:

- `app.erp_docfields` — field definitions
- `app.erp_list_views` — list view configuration
- `app.erp_form_layouts` — form layout configuration
- `app.erp_doctype_actions` — action-to-permission mapping
- `app.erp_workspace_items` — sidebar navigation entry
- A data storage/API layer — actual record persistence

Existing DocTypes (product_category, unit_of_measure, product) use **physical tables** in the `wh` schema with hand-coded RPC functions. This is not suitable for user-created DocTypes because:

1. Creating physical tables from the UI is a security risk
2. Dynamic schema changes break Supabase type safety
3. Each new DocType would need custom RPC code
4. Supabase migrations are the correct path for physical schema changes

## Solution: Generic JSON Document Storage

New custom DocTypes use a **generic JSON document store** (`app.erp_documents`) instead of physical tables. All records are stored as `data jsonb` with validation against `app.erp_docfields`.

### Storage Strategy

A new column `storage_strategy` on `app.erp_doctypes` distinguishes the two approaches:

| Value | Description | Used By |
|-------|-------------|---------|
| `physical_rpc` | Physical DB table + hand-coded RPC functions | product_category, unit_of_measure, product |
| `generic_json` | JSON document store in `app.erp_documents` | Custom DocTypes created from Metadata Studio |

### Architecture

```
Metadata Studio → Creates DocType (storage_strategy = generic_json)
                → Creates DocFields, List View, Form Layout, Actions, Workspace Item
                ↓
ERP Menu → DynamicListPage → doctype-api-map detects generic_json
          → Uses GenericDocTypeApi → calls public.erp_list_documents / create / update / deactivate
          ↓
Supabase RPC → Validates doctype exists, is active, storage_strategy = generic_json
             → Validates fields against erp_docfields (required fields exist, unknown fields rejected)
             → Checks permissions via erp_doctype_actions
             → Reads/Writes app.erp_documents
             → Writes version history to app.erp_document_versions
```

### Tables

#### `app.erp_documents`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| doctype_key | text FK → erp_doctypes | Which DocType this record belongs to |
| company_id | uuid FK → tenants | Company context (can be null for global) |
| document_number | text | Optional naming series output |
| title | text | Display title for list views |
| data | jsonb NOT NULL DEFAULT '{}' | All dynamic field values stored here |
| is_active | boolean DEFAULT true | Soft delete |
| created_by | uuid | auth.uid() |
| updated_by | uuid | auth.uid() |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

#### `app.erp_document_versions`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| document_id | uuid FK → erp_documents | Parent document |
| doctype_key | text | Denormalized for query convenience |
| version_number | int | Auto-increment per document |
| data | jsonb NOT NULL | Snapshot of data at this version |
| changed_by | uuid | auth.uid() |
| changed_at | timestamptz | now() |
| change_reason | text | Optional reason |

### RPC Functions

All RPC functions are `SECURITY DEFINER` with `SET search_path = ''` and enforce:

1. DocType exists, is active, and `storage_strategy = 'generic_json'`
2. User has the required permission via `erp_doctype_actions`
3. Field validation against `erp_docfields`
4. Company context for `is_company_scoped = true` DocTypes

| Function | Purpose |
|----------|---------|
| `public.erp_list_documents(p_doctype_key, p_company_id)` | List active documents for a DocType |
| `public.erp_get_document(p_doctype_key, p_document_id)` | Get single document by ID |
| `public.erp_create_document(p_doctype_key, p_company_id, p_data)` | Create with field validation |
| `public.erp_update_document(p_doctype_key, p_document_id, p_data)` | Update with field validation + versioning |
| `public.erp_deactivate_document(p_doctype_key, p_document_id)` | Soft delete |

### Frontend Changes

1. `doctype-api-map.ts` — new `createGenericDocTypeApi(doctypeKey)` factory function
2. `doctype-registry.ts` — `loadDocTypeConfig` already fetches all metadata including `doctype_key` → sufficient for detecting `generic_json`
3. `DynamicListPage` — no changes needed (already uses `getDocTypeApi` which returns null for unregistered → shows helpful message)
4. `DynamicRouteRenderer.tsx` — add generic workspace item support (item_type=doctype with generic_json)
5. Metadata Studio DocType form — add `storage_strategy` field with dropdown

### Metadata Studio Helper

When creating a custom DocType:

1. Select `storage_strategy = generic_json`
2. Optionally click "Generate Starter Metadata" which creates:
   - Basic DocFields (name/title, is_active, notes)
   - Default List View (title, is_active columns)
   - Default Form Layout (one section with all fields)
   - Default Actions (read, create, update, deactivate)
   - Workspace Item in selected workspace

### RLS

- `erp_documents`: SELECT via `public.erp_list_documents` / `public.erp_get_document` (RPC), no direct table access from frontend
- `erp_documents`: INSERT/UPDATE/DELETE blocked for frontend (only through RPC)
- `erp_document_versions`: INSERT only from `erp_update_document` trigger/RPC, SELECT for authenticated, no UPDATE/DELETE

## Out of Scope

- Physical table creation from UI (still migration-only)
- Warehouse CRUD (Phase 3)
- GRN/Stock Ledger (Phase 4+)
- Workflow transition engine
- Naming series auto-generation
- Custom server-side validation scripts
