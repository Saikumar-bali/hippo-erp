# Phase 6.8.2 — Report Secrets Cleanup and Restricted-User Evidence Gate

**Date:** 2026-06-06
**Branch:** phase-2.5-metadata-engine
**Previous commit:** d90a1f9 (Phase 6.8.1)
**Corrective commit:** 931582c (Phase 6.8.2 gate added)

## Summary

Removes all hardcoded secrets from committed scripts and proves restricted-user report security in both cloud RPC tests and browser UI.

## Secret Cleanup Summary

### Removed from `verify_phase6_8_1_report_security_cloud.mjs`
- Hardcoded Supabase service_role JWT (full database access, bypasses RLS)
- Hardcoded publishable key fallbacks (`sb_publishable_Wl_...`)
- Hardcoded admin/low-priv password fallbacks (`Phase64Admin!2026`, `Phase64Low!2026`)
- Hardcoded email fallbacks
- Hardcoded project ref

### Fixed in other scripts
| Script | Secret removed |
|--------|---------------|
| `verify-supabase-redirect-allowlist.mjs` | Hardcoded URL + publishable key |
| `verify-auth-redirects.mjs` | Hardcoded URL + publishable key |
| `verify_phase6_7_workflow_docstatus_browser.mjs` | Hardcoded password fallback |
| `verify_phase6_7_workflow_docstatus_cloud.mjs` | Hardcoded project ref fallback |
| `verify_phase6_7_1_workflow_security_regression.mjs` | Hardcoded project ref fallback |
| `verify_phase6_8_report_builder_cloud.mjs` | Hardcoded project ref |
| `verify_phase6_8_report_builder_browser.mjs` | Hardcoded base URL fallback |

### Current state
- All scripts use `requireEnv()` and exit non-zero on missing env vars
- No hardcoded secrets remain at branch tip
- `.env` file contains credentials but is not committed to git

## Credential Rotation Status

| Credential | Status | Action required |
|-----------|--------|-----------------|
| Service role JWT | Exposed in git history | Rotate via Supabase Dashboard → Settings → API |
| Publishable key | Exposed in git history | Rotate via Supabase Dashboard → Settings → API |
| Test admin password | Exposed in git history | Rotate via Supabase Dashboard → Authentication → Users |
| Test low-priv password | Exposed in git history | Rotate via Supabase Dashboard → Authentication → Users |
| Management API token | Not exposed (env-only) | No action needed |

**Note:** Rotation cannot be performed via Management API. Manual dashboard action required.

## Cloud Verification (36/36 PASS)

| # | Check | Status |
|---|-------|--------|
| 1 | Owner insert policies: 3 | ✅ |
| 2 | Owner update policies: 3 | ✅ |
| 3 | Owner delete policies: 3 | ✅ |
| 4 | No old permissive policies remain | ✅ |
| 5 | current_user_has_report_permission exists | ✅ |
| 6 | All 6 RPCs granted to authenticated | ✅ |
| 7 | erp_create_report: owner/admin gate | ✅ |
| 8 | erp_delete_report: owner/admin gate | ✅ |
| 9 | erp_get_report_definition: view_reports gate | ✅ |
| 10 | erp_list_reports: view_reports gate | ✅ |
| 11 | erp_run_report: view_reports gate | ✅ |
| 12 | erp_update_report: owner/admin gate | ✅ |
| 13 | erp_list_reports: 2 reports | ✅ |
| 14 | erp_get_report_definition: 3 columns | ✅ |
| 15 | erp_run_report (admin): 51 rows | ✅ |
| 16 | erp_run_report (in operator): 0 rows | ✅ |
| 17 | erp_run_report (contains): 0 rows | ✅ |
| 18 | 2 standard reports exist | ✅ |
| 19 | Standard report delete blocked | ✅ |
| 20 | Standard report update blocked | ✅ |
| 21 | Cross-company access blocked (list) | ✅ |
| 22 | Cross-company access blocked (definition) | ✅ |
| 23 | Low-priv list_reports: 2 reports | ✅ |
| 24 | Low-priv erp_run_report: 14 rows | ✅ |
| 25 | Low-priv: email field masked | ✅ |
| 26 | Low-priv: phone field masked | ✅ |
| 27 | Low-priv: notes field masked | ✅ |
| 28 | Low-priv: email column hidden from definition | ✅ |
| 29 | Low-priv: phone column hidden from definition | ✅ |
| 30 | Low-priv: notes column hidden from definition | ✅ |
| 31 | Low-priv: filter cannot reveal masked fields | ✅ |
| 32 | All 3 columns have valid metadata | ✅ |
| 33 | Custom report created | ✅ |
| 34 | Custom report updated | ✅ |
| 35 | Custom report deleted | ✅ |
| 36 | Opportunity report returns 9 rows | ✅ |

## Browser Verification (23/23 PASS)

| # | Check | Status |
|---|-------|--------|
| 1 | Admin login | ✅ |
| 2 | Reports workspace navigated | ✅ |
| 3 | Reports page loaded | ✅ |
| 4 | CRM Lead report visible (admin) | ✅ |
| 5 | CRM Opportunity report visible (admin) | ✅ |
| 6 | Clicked Run on CRM Lead report (admin) | ✅ |
| 7 | Admin report heading: "CRM Lead List Report" | ✅ |
| 8 | Run Report button visible | ✅ |
| 9 | Admin results table visible (51 rows) | ✅ |
| 10 | Admin column headers: Lead Name, Company Name, Status | ✅ |
| 11 | Admin row count: "51 rows returned" | ✅ |
| 12 | Back to Reports | ✅ |
| 13 | Logout | ✅ |
| 14 | Restricted user login | ✅ |
| 15 | Restricted user: Reports workspace navigated | ✅ |
| 16 | Restricted user: Reports page loaded | ✅ |
| 17 | Restricted user: Clicked Run on CRM Lead report | ✅ |
| 18 | Restricted user: Report executed | ✅ |
| 19 | Restricted user: Results table visible (14 rows) | ✅ |
| 20 | Restricted user: email column hidden | ✅ |
| 21 | Restricted user: phone column hidden | ✅ |
| 22 | Restricted user: notes column hidden | ✅ |
| 23 | No page errors | ✅ |

## Screenshots and Results

- Cloud results: inline (36/36 PASS)
- Browser results: `C:/tmp/phase-6-8-2-report-secrets/results.json`
- Browser screenshots: `C:/tmp/phase-6-8-2-report-secrets/*.png`

## Command Results

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint src/` | ✅ 0 errors, 55 warnings |
| `npx vitest run` | ✅ 77/77 PASS (1 flaky re-run passed) |
| `npx vite build` | ✅ SUCCESS |
| `node scripts/verify_phase6_8_1_report_security_cloud.mjs` | ✅ 36/36 PASS |
| `node scripts/verify_phase6_8_1_report_security_browser.mjs` | ✅ 23/23 PASS |

## Remaining Gaps

1. **Credential rotation not yet performed**: Service role key and test passwords need manual rotation in Supabase Dashboard. The `.env` file still contains the old credentials.
2. **Phase 6.9 is NOT started**
3. **No pre-commit hook for secret detection**: Consider adding gitleaks or trufflehog
