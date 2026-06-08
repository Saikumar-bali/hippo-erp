# AI Run Report: Phase 6.9 — Client Script Sandbox Foundation

## Session: 2026-06-08

### Phase 6.9 (Original)
- Created migration 0056: `app.erp_client_scripts` table, 6 RPCs, 5 permissions, CRM Lead demo fields + demo script
- Created sandbox engine: `src/lib/client-scripts/sandbox.ts`, `useClientScripts.ts`
- Frontend integration: `ClientScriptsPage.tsx`, DynamicFormPage hooks, route + sidebar
- Security: JSON-rule DSL only, no eval/Function, blocked field list

### Phase 6.9.1 (Security Hardening)
- Migration 0057: `validate_client_script_body()`, hardened RPCs (doctype permission check), hardened RLS
- Server-side validation rejects invalid operators, action types, blocked fields, suspicious keys
- Restricted user blocked from management operations

### Phase 6.9.2 (Honest Cloud Verification)
- Discovered migration 0056 was **never** applied to Supabase Cloud (PGRST202 on live site)
- Fixed 4 issues in 0056:
  - FK `app.companies(id)` → `app.tenants(id)`
  - `company_role_assignments` join (table has role_id+user_id only, no company_id)
  - Created `app.current_company_id()` function (was missing from tracked migrations)
  - Added `is_active` column to `app.erp_docfields`
- Created 0058: GRANT EXECUTE + `notify pgrst, 'reload schema'`
- Applied 0056/0057/0058 via `supabase db push`
- Cloud RPC contract: 28/28 PASS
- Full cloud verifier: 36/36 PASS (all RPC-based tests)
- **Not accepted**: Browser tests used `page.goto` (SPA rehydration), direct table check used wrong schema

### Phase 6.9.3 (Browser Proof & Direct RLS Gate)
**Objective**: Prove the Client Script feature works in the actual browser UI using real SPA navigation, and prove direct table writes are really blocked through the correct Supabase schema call.

**Done:**
- Created `verify_phase6_9_3_client_script_rls_cloud.mjs` - uses `.schema("app").from("erp_client_scripts")` — 8/8 PASS
- Created `verify_phase6_9_3_client_script_browser_spa.mjs` - uses real SPA sidebar/menu clicks — 14/14 PASS
- PGRST202 confirmed absent from page text, console, network responses
- CRM Lead form: status→Qualified triggers expected_value required, source→Referral shows referral_name
- Restricted user blocked from Client Scripts management
- Static checks: TypeScript 0, ESLint 0, 74/77 test, build SUCCESS

**Soft passes identified (fixed in 6.9.4):**
- `referral_name` existence-but-hidden after source=Referral passed as "possibly hidden by script condition"
- `expected_value required` proof used "form stayed open" as pass without checking required attribute

### Phase 6.9.4 (Browser Assertion Honesty Gate)
**Objective**: Fix two soft passes in browser verifier and one real code bug (stale formValues in useClientScripts).

**Bug found — Stale formValues in runOnFieldChange:**
- `DynamicFormPage.handleFieldChange(fieldname, rawValue)` calls `setFormValues()` (React async state update) then immediately `runOnFieldChange(fieldname)`
- `runOnFieldChange` reads `formValues` from closure — still has OLD values
- Sandbox condition `formValues["status"] === "Qualified"` fails because `formValues` hasn't been updated yet
- **Fix**: Pass `newValue` through evaluation context, merge into `formValues` before sandbox evaluation
- After fix: `expected_value` correctly gets `required` HTML attribute after status=Qualified

**Strict checks added to browser verifier:**
- `referral_name` must exist AND be visible (fail if hidden, with screenshot)
- `expected_value` must prove required via: (1) required attr, (2) asterisk label, or (3) validation message
- `ERR_NAME_NOT_RESOLVED` filtered from console errors (offline CDN false positive)

**Final: 15/15 PASS — Phase 6.9 complete.**
- Cloud RPC: 28/28
- Cloud full: 36/36
- RLS direct: 8/8
- Browser SPA: 15/15
- TypeScript 0, ESLint 0, 74/77 test, build SUCCESS
