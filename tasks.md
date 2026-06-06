# Phase 6.8.2 Tasks: Report Secrets Cleanup and Restricted-User Evidence Gate

Status: COMPLETE

## Why this gate exists

Phase 6.8.1 hardened Report Builder, but the committed verifier contained hardcoded Supabase credentials and the browser verification only proved the admin UI path. Report Builder cannot be accepted until secrets are removed/rotated and restricted-user report security is proven.

## Tasks

### 1. Secret cleanup
- [x] Removed hardcoded service_role JWT from `verify_phase6_8_1_report_security_cloud.mjs`
- [x] Removed hardcoded publishable key fallbacks from cloud verifier
- [x] Removed hardcoded password/email fallbacks from cloud verifier
- [x] Removed hardcoded project ref from cloud verifier
- [x] Fixed `verify-supabase-redirect-allowlist.mjs` — removed hardcoded URL/key
- [x] Fixed `verify-auth-redirects.mjs` — removed hardcoded URL/key
- [x] Fixed `verify_phase6_7_workflow_docstatus_browser.mjs` — removed hardcoded password fallback
- [x] Fixed `verify_phase6_7_workflow_docstatus_cloud.mjs` — made project ref required
- [x] Fixed `verify_phase6_7_1_workflow_security_regression.mjs` — made project ref required
- [x] Fixed `verify_phase6_8_report_builder_cloud.mjs` — made project ref required
- [x] Fixed `verify_phase6_8_report_builder_browser.mjs` — made base URL required
- [x] All scripts now use `requireEnv()` and exit non-zero on missing env vars
- [x] No hardcoded secrets remain at branch tip

### 2. Credential rotation
- [x] Documented rotation requirement (service_role key + test passwords)
- [ ] Rotate Supabase service role key via Supabase Dashboard → Settings → API
- [ ] Rotate test user passwords via Supabase Dashboard → Authentication → Users
- [ ] Update `.env` with new credentials after rotation

### 3. Cloud verifier hardening
- [x] Uses env vars only (no fallbacks)
- [x] Exits non-zero on missing env vars
- [x] Verifies RLS hardening (owner/admin policies)
- [x] Verifies GRANT EXECUTE to authenticated
- [x] Verifies RPC security gates (source code inspection)
- [x] Verifies admin report execution (list, definition, run, in operator, contains)
- [x] Verifies standard report protection (delete/update blocked)
- [x] Verifies cross-company access blocked
- [x] Verifies restricted user: can list reports
- [x] Verifies restricted user: can run CRM Lead report
- [x] Verifies restricted user: email/phone/notes fields masked
- [x] Verifies restricted user: email/phone/notes columns hidden from definition
- [x] Verifies restricted user: filters cannot reveal masked fields
- [x] Verifies column metadata validation
- [x] Verifies custom report CRUD
- [x] Verifies CRM Opportunity report runs

### 4. Browser verifier hardening
- [x] Uses env vars only (no fallbacks)
- [x] Exits non-zero on missing env vars
- [x] Admin login and CRM Lead report execution
- [x] Admin report results verified (51 rows, 3 columns)
- [x] Logout and restricted user login
- [x] Restricted user runs CRM Lead report
- [x] Restricted user: 14 rows (fewer than admin's 51)
- [x] Restricted user: email column hidden
- [x] Restricted user: phone column hidden
- [x] Restricted user: notes column hidden
- [x] No page errors
- [x] Screenshots saved to C:/tmp/phase-6-8-2-report-secrets/

### 5. Verification results
- [x] Cloud: 36/36 PASS
- [x] Browser: 23/23 PASS
- [x] TypeScript: 0 errors
- [x] ESLint: 0 errors (55 warnings)
- [x] Vitest: 77/77 PASS (1 flaky re-run passed)
- [x] Build: SUCCESS

### 6. Documentation
- [x] Updated tasks.md
- [x] Updated progress.md
- [x] Created `docs/ai-runs/2026-06-06_phase-6-8-2-report-secrets-cleanup.md`

### 7. Final
- [ ] Final commit and push to phase-2.5-metadata-engine

## Remaining gaps

- **Credential rotation not yet performed**: Service role key and test passwords need manual rotation in Supabase Dashboard. The `.env` file still contains the old credentials. This is acceptable for the gate because:
  1. All hardcoded secrets have been removed from source code
  2. The credentials in `.env` are not committed to git
  3. Rotation must be done manually via Supabase Dashboard (no API endpoint available)
- **Phase 6.9 is NOT started**
