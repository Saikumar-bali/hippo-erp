# Phase 6.9 / 6.9.1 Tasks: Client Script Sandbox Foundation + Security Hardening

Status: ACTIVE (hardening)

## Summary

Safe, Frappe-like Client Script foundation for metadata-driven DocTypes. Client Scripts use a JSON-rule DSL (not JavaScript) to define safe form behavior — no eval, no Function constructor, no access to window/document/localStorage/fetch.

Phase 6.9: Base migration (0056), sandbox engine, frontend integration, CRM Lead demo.
Phase 6.9.1: Security hardening migration (0057), server-side validation, hardened RPCs, hardened RLS, verification gates.

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

### 2. Cloud Verification
- [ ] Migration 0057 applied to Supabase Cloud
- [ ] Cloud verifier: ALL PASS (requires Supabase Cloud)
- [ ] 17+ checks: table exists, validation function, RPCs, permissions, admin CRUD, restricted blocked, cross-company fail, invalid body rejected, unsafe actions rejected, raw-code payloads rejected, CRM Lead demo, CRM Opportunity CRUD, direct table write blocked

### 3. Browser Verification
- [ ] Browser verifier: ALL PASS (requires running dev server)
- [ ] 15+ checks: admin login, scripts page, demo script visible, lead form, expected_value/referral_name fields, status→Qualified validation, source→Referral referral_name visible, restricted user blocked, CRM Lead loads, no page errors

### 4. Static Checks
- [x] TypeScript: 0 errors
- [x] ESLint: 0 errors
- [x] Vitest: 74/77 PASS (3 pre-existing failures)
- [x] Build: SUCCESS
- [x] Simulation: scripts ready

### 5. Documentation & Push
- [ ] Update docs/PHASE_6_9_CLIENT_SCRIPT_SANDBOX_FOUNDATION.md with closeout
- [ ] Update docs/ai-runs/2026-06-08_phase-6-9-client-script-sandbox-foundation.md with closeout
- [ ] Final commit pushed to `phase-2.5-metadata-engine`

**Note:** Cloud/browser verifiers require Supabase Cloud migrations 0056+0057 applied + dev server. Not yet run.
