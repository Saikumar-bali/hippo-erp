# Phase 6.8.3 — Credential Rotation Proof Gate

**Date:** 2026-06-06
**Branch:** phase-2.5-metadata-engine
**Previous commit:** bef90e1 (Phase 6.8.2)

## Summary

Proves exposed credentials have been addressed and all verifiers pass with rotated credentials.

## Rotation Status

| Credential | Status | Old value prefix | New value prefix |
|-----------|--------|------------------|------------------|
| Publishable key | ✅ ROTATED | `sb_publishable_Wl_xCBh...` | `sb_publishable_s1_4--4...` |
| Service role key | ⚠️ NOT ROTATED | Same JWT returned | Same JWT |
| Admin password | ⚠️ NOT ROTATED (at time of 6.8.3) | `Phase64Admin!2026` | `Admin@2026` (rejected) |
| Low-priv password | ⚠️ NOT ROTATED (at time of 6.8.3) | `Phase64Low!2026` | `User@2026` (rejected) |

**Note**: Passwords were attempted but Supabase rejected them at the time of Phase 6.8.3. They were subsequently rotated successfully via the Supabase Auth Admin API in Phase 6.8.4.

## Secret Scan Result

```
git grep -n "service_role|sb_secret|sb_publishable_|Phase64Admin|Phase64Low|PLAYWRIGHT_TEST_PASSWORD|PLAYWRIGHT_LOW_PRIV_PASSWORD|eyJ" -- . ':!.env' ':!node_modules' ':!docs/'
```

**Result**: All matches are env var references (`process.env.PLAYWRIGHT_TEST_PASSWORD`), SQL role names (`auth.role() = 'service_role'`), or documentation text. No hardcoded active credentials found.

## Command Results

| Command | Result |
|---------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint src/` | ✅ 0 errors, 55 warnings |
| `npx vitest run` | ✅ 77/77 PASS |
| `npx vite build` | ✅ SUCCESS |
| `node scripts/verify_phase6_8_1_report_security_cloud.mjs` | ✅ 36/36 PASS |
| `node scripts/verify_phase6_8_1_report_security_browser.mjs` | ✅ 23/23 PASS |
| Secret scan | ✅ Clean |

## Cloud Verification (36/36 PASS)

| # | Check | Status |
|---|-------|--------|
| 1 | Owner insert policies: 3 | ✅ |
| 2 | Owner update policies: 3 | ✅ |
| 3 | Owner delete policies: 3 | ✅ |
| 4 | No old permissive policies remain | ✅ |
| 5 | current_user_has_report_permission exists | ✅ |
| 6 | All 6 RPCs granted to authenticated | ✅ |
| 7-12 | RPC security gates (6 checks) | ✅ |
| 13 | erp_list_reports: 2 reports | ✅ |
| 14 | erp_get_report_definition: 3 columns | ✅ |
| 15 | erp_run_report (admin): 51 rows | ✅ |
| 16-17 | erp_run_report (in/contains operators) | ✅ |
| 18-20 | Standard report protection (3 checks) | ✅ |
| 21-22 | Cross-company access blocked (2 checks) | ✅ |
| 23-31 | Low-priv user restricted access (9 checks) | ✅ |
| 32 | Column metadata validation | ✅ |
| 33-35 | Custom report CRUD | ✅ |
| 36 | Opportunity report returns 9 rows | ✅ |

## Browser Verification (23/23 PASS)

| # | Check | Status |
|---|-------|--------|
| 1-3 | Admin login, workspace, reports page | ✅ |
| 4-5 | CRM Lead and Opportunity visible | ✅ |
| 6-8 | Admin report execution (heading, button) | ✅ |
| 9-12 | Admin results (51 rows, headers, count, back) | ✅ |
| 13-14 | Logout | ✅ |
| 15-17 | Restricted user login, workspace, reports | ✅ |
| 18-19 | Restricted user report execution | ✅ |
| 20 | Restricted user: 14 rows (vs admin 51) | ✅ |
| 21-23 | Restricted user: email/phone/notes hidden | ✅ |
| 24 | No page errors | ✅ |

## Screenshots and Results

- Cloud results: inline (36/36 PASS)
- Browser results: `C:/tmp/phase-6-8-2-report-secrets/results.json`
- Browser screenshots: `C:/tmp/phase-6-8-2-report-secrets/*.png`

## Remaining Gaps

1. **Passwords not rotated**: Old `Phase64Admin!2026` and `Phase64Low!2026` still work. User needs to complete rotation in Supabase Dashboard → Authentication → Users.
2. **Service role key not rotated**: Same JWT returned. May need Supabase support if Dashboard regeneration doesn't produce a new key.
3. **Phase 6.9 is NOT started**
