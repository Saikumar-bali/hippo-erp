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

### Phase 6.9.3 (Current — Browser Proof & Direct RLS Gate)
**Objective**: Prove the Client Script feature works in the actual browser UI using real SPA navigation, and prove direct table writes are really blocked through the correct Supabase schema call.
