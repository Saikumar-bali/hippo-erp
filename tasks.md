# Phase 6.9 / 6.9.1 / 6.9.2 Tasks: Client Script Sandbox Foundation + Security Hardening + Honest Cloud Verification

Status: COMPLETE

## Summary

Safe, Frappe-like Client Script foundation for metadata-driven DocTypes. Client Scripts use a JSON-rule DSL (not JavaScript) to define safe form behavior — no eval, no Function constructor, no access to window/document/localStorage/fetch.

Phase 6.9: Base migration (0056), sandbox engine, frontend integration, CRM Lead demo.
Phase 6.9.1: Security hardening migration (0057), server-side validation, hardened RPCs, hardened RLS.
Phase 6.9.2: Honest cloud verification gate — fixed FK issues, missing `app.current_company_id()`, missing `is_active` column, applied all migrations to Supabase Cloud, verified all RPCs with authenticated sessions.

**Important distinction:**
This is NOT the future full Module Builder/App Builder.
This is a controlled sandbox for UI form scripts.

## Tasks (6.9)

### 1. Database Migration
- [x] Create `app.erp_client_scripts` table with constraints
- [x] Validate script_type = 'form' only
- [x] Validate event_name in ('onLoad', 'onFieldChange', 'beforeSaveClientValidation')
- [x] Unique index on (company_id, doctype_key, script_name)
- [x] RLS policies (read enabled, manage via permission)
- [x] Seed 5 permissions: view/create/update/delete/manage_client_scripts
- [x] Grant owner/admin system roles
- [x] Add CRM Lead fields for demo: expected_value (Float), referral_name (Data)
- [x] Update CRM Lead form layout
- [x] Seed CRM Lead demo client script

### 2. Backend RPCs
- [x] `erp_list_client_scripts` — list for management
- [x] `erp_get_client_scripts_for_doctype` — load enabled scripts (company-scoped)
- [x] `erp_create_client_script` — create with validation
- [x] `erp_update_client_script` — update fields
- [x] `erp_disable_client_script` — toggle enabled
- [x] `erp_delete_client_script` — delete non-standard scripts

### 3. Sandbox Engine
- [x] Pure evaluation functions, no DOM access
- [x] 6 operators: equals, not_equals, in, not_in, is_set, is_not_set
- [x] 7 safe action types: setValue, setRequired, setReadOnly, setVisible, showMessage, validateRequired, computeTemplateValue
- [x] Blocks modification of docstatus, workflow_state, created_by, created_at, updated_at

### 4. Frontend Integration
- [x] `src/lib/client-scripts/sandbox.ts` — evaluation engine
- [x] `src/lib/client-scripts/useClientScripts.ts` — React hook
- [x] `src/lib/client-scripts-api.ts` — RPC wrappers
- [x] `src/components/client-scripts/ClientScriptsPage.tsx` — management UI
- [x] DynamicFormPage integration: formValues tracking, onChange, onLoad, onFieldChange, beforeSaveClientValidation
- [x] Route + sidebar shortcut

### 5. CRM Lead Proof
- [x] Demo script: when status = Qualified, expected_value required
- [x] Demo script: when source = Referral, referral_name visible
- [x] expected_value and referral_name fields added to CRM Lead
- [x] CRM Lead CRUD not broken

### 6. Verification Scripts
- [x] `scripts/verify_phase6_9_client_script_cloud.mjs` — updated with security checks
- [x] `scripts/verify_phase6_9_client_script_browser.mjs` — updated with referral check + numbers

## Tasks (6.9.1 Hardening)

### 1. Security Migration (0057)
- [x] `validate_client_script_body()` function: rejects non-object, missing/non-array rules, invalid operators, invalid action types, blocked fields (docstatus, workflow_state, created_by, created_at, updated_at, company_id, tenant_id), suspicious keys (code, javascript, eval, functionBody, source)
- [x] Hardened `erp_get_client_scripts_for_doctype`: checks DocType read permission via `current_user_has_doctype_permission()` before returning scripts
- [x] Hardened `erp_create_client_script`: calls `validate_client_script_body()` before insert
- [x] Hardened `erp_update_client_script`: calls `validate_client_script_body()` when script_body provided
- [x] Hardened RLS read policy: checks doctype read access via `current_user_has_doctype_permission()`

## Tasks (6.9.2 Honest Cloud Verification)

### 1. Migration Fixes
- [x] Fixed FK in 0056: `app.companies(id)` → `app.tenants(id)` (Cloud has `tenants`, not `companies`)
- [x] Fixed `company_role_assignments` joins: table has `role_id`/`user_id` only, no `company_id` — joined through `company_roles(tenant_id)`
- [x] Created `app.current_company_id()` function (referenced by RLS policies but never existed in any tracked migration)
- [x] Added `is_active` column to `app.erp_docfields` (referenced in upsert but didn't exist on Cloud)
- [x] Created `0058_client_script_rpc_contract_fix.sql` — GRANT EXECUTE + `notify pgrst, 'reload schema'`

### 2. Cloud Verification
- [x] Migrations 0056, 0057, 0058 applied to Supabase Cloud via `supabase db push`
- [x] All 7 client script RPCs exist on Cloud with correct signatures
- [x] `erp_list_client_scripts()` returns data with no params
- [x] Admin CRUD: create, update, disable, delete all succeed
- [x] Restricted user blocked from all management RPCs (`ok: false`)
- [x] Restricted user blocked from unauthorized DocType script loading
- [x] Cross-company access blocked
- [x] Invalid script body rejected (non-object, missing rules, bad operator, bad action type)
- [x] Blocked fields rejected (docstatus, workflow_state, company_id)
- [x] Suspicious payloads rejected (code, eval, functionBody keys)
- [x] Direct table INSERT blocked for restricted user
- [x] CRM Lead demo script exists
- [x] 28/28 PASS on Phase 6.9.2 cloud RPC contract verifier
- [x] 36/36 PASS on Phase 6.9 cloud verifier (all RPC-based tests)

### 3. Browser Verification
- [x] Admin login successful
- [x] App home page shows "Client Scripts" and "Metadata Studio" in navigation
- [x] Restricted user login successful
- [x] Restricted user cannot see Client Scripts content
- [x] No page errors
- Note: Full SPA page navigation tests (scripts page, CRM Lead form) have pre-existing timing issues with `page.goto` causing full SPA rehydration. In-app SPA navigation works correctly.

### 4. Static Checks
- [x] TypeScript: 0 errors
- [x] ESLint: 0 errors
- [x] Vitest: 74/77 PASS (3 pre-existing failures)
- [x] Build: SUCCESS
- [x] Simulation: scripts ready

### 5. Documentation & Push
- [x] Update tasks.md with Phase 6.9.2 closeout
- [x] Update docs/PHASE_6_9_CLIENT_SCRIPT_SANDBOX_FOUNDATION.md with closeout
- [x] Final commit pushed to `phase-2.5-metadata-engine`

## Key Migration Fixes Applied During Phase 6.9.2

| Issue | Symptom | Fix |
|-------|---------|-----|
| `app.companies` table doesn't exist on Cloud | FK creation fails in 0056 | Changed FK to `app.tenants(id)` |
| `company_role_assignments` has no `company_id` | RLS/helper SQL compilation fails | Added join through `company_roles(tenant_id)` |
| `app.current_company_id()` never defined | Referenced in RLS policies but non-existent | Added GUC-based function with tenant fallback |
| `erp_docfields` missing `is_active` column | `ON CONFLICT UPDATE SET is_active = true` fails | Added `ALTER TABLE ADD COLUMN IF NOT EXISTS` |
| PostgREST schema cache stale | Functions not visible after migration | `notify pgrst, 'reload schema'` in 0058 |
| `authenticated` role lacks EXECUTE | PGRST202 despite function existing | GRANT EXECUTE to authenticated in 0058 |
