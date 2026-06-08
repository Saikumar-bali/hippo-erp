# Phase 6.9 Tasks: Client Script Sandbox Foundation

Status: ACTIVE

## Summary

Add a safe, Frappe-like Client Script foundation for metadata-driven DocTypes. Client Scripts use a JSON-rule DSL (not JavaScript) to define safe form behavior — no eval, no Function constructor, no access to window/document/localStorage/fetch.

**Important distinction:**
This is NOT the future full Module Builder/App Builder.
This is a controlled sandbox for UI form scripts.
Phase 6.9 does not include: full Module Builder, App Builder, Purchase Orders, Purchase Invoice, Fleet, PDF generation, or any new business module.

## Tasks

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
- [ ] `scripts/verify_phase6_9_client_script_cloud.mjs` — not yet run
- [ ] `scripts/verify_phase6_9_client_script_browser.mjs` — not yet run

### 7. Verification
- [x] TypeScript: 0 errors
- [x] ESLint: 0 errors
- [x] Vitest: 74/77 PASS (3 pre-existing failures)
- [x] Build: SUCCESS
- [x] Simulation: scripts ready
- [ ] Cloud verifier: ALL PASS (requires Supabase Cloud + migration applied)
- [ ] Browser verifier: ALL PASS (requires running dev server)
- [x] Restricted user management blocked (RPC permission check)

### 8. Documentation
- [x] Created `docs/PHASE_6_9_CLIENT_SCRIPT_SANDBOX_FOUNDATION.md`
- [x] Created `docs/ai-runs/2026-06-08_phase-6-9-client-script-sandbox-foundation.md`
- [ ] Docs state: Not the future full Module Builder. Phase 6.9 deferred items listed.

### 9. Push
- [ ] Final commit pushed to `phase-2.5-metadata-engine`
