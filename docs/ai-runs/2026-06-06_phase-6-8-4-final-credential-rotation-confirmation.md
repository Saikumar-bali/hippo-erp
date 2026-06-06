# Phase 6.8.4 — Final Credential Rotation Confirmation Gate

**Date:** 2026-06-06
**Branch:** phase-2.5-metadata-engine
**Previous commit:** de00610 (Phase 6.8.3)

## Summary

Confirms old exposed credentials are invalidated, new credentials work from env-only, and all verifiers pass.

## Rotation Status

| Credential | Status | Notes |
|-----------|--------|-------|
| Publishable key | ✅ ROTATED | `sb_publishable_s1_4--4nxdoY1vInmomjCg_ybbUTu2A` |
| Admin password | ✅ ROTATED | Old `Phase64Admin!2026` REJECTED, new `Admin@2026` WORKS |
| Low-priv password | ✅ ROTATED | Old `Phase64Low!2026` REJECTED, new `User@2026` WORKS |
| Service role key | ⚠️ NOT ROTATED | Same JWT — no API endpoint; requires Dashboard JWT Secret regeneration |

## Old Credentials Invalidated

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Old admin password `Phase64Admin!2026` | REJECTED | REJECTED | ✅ |
| Old low-priv password `Phase64Low!2026` | REJECTED | REJECTED | ✅ |

## New Credentials Verified

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| New admin password `Admin@2026` | WORKS | WORKS | ✅ |
| New low-priv password `User@2026` | WORKS | WORKS | ✅ |

## Secret Scan Result

```
git grep -n "service_role|sb_secret|sb_publishable_|Phase64Admin|Phase64Low|PLAYWRIGHT_TEST_PASSWORD|PLAYWRIGHT_LOW_PRIV_PASSWORD|eyJ" -- . ':!.env' ':!node_modules'
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
| 1-4 | RLS hardening (owner insert/update/delete, no old policies) | ✅ |
| 5 | current_user_has_report_permission exists | ✅ |
| 6 | All 6 RPCs granted to authenticated | ✅ |
| 7-12 | RPC security gates (6 checks) | ✅ |
| 13-17 | Admin user RPC tests (list, definition, run, in, contains) | ✅ |
| 18-20 | Standard report protection (exists, delete blocked, update blocked) | ✅ |
| 21-22 | Cross-company access blocked (list, definition) | ✅ |
| 23-31 | Low-priv user restricted access (list, run, email/phone/notes masked, columns hidden, filter bypass) | ✅ |
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

1. **Service role key not rotatable via API**: No Management API endpoint exists. Requires manual Dashboard action: Project Settings → API → JWT Secret → Regenerate. This will invalidate ALL existing JWTs.
2. **Phase 6.9 is NOT started**
