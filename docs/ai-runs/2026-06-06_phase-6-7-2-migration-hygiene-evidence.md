# Phase 6.7.2: Workflow Migration Hygiene and Evidence Gate

**Date:** 2026-06-06
**Branch:** phase-2.5-metadata-engine
**Status:** COMPLETE

## Goal

Cleanly close Phase 6.7 / 6.7.1 without migration ambiguity or debug leftovers.

## What was done

### 1. Migration 0052 Decision

**Decision: Path B — 0052 deleted.**

`supabase/migrations/0052_workflow_security_regression_fix.sql` was created during Phase 6.7.1 to restore Phase 6.5/6.6.1 protections that Migration 0051 overwrote. However:

- The Supabase Cloud database already has all 8 RPCs with the exact protections 0052 defines.
- Cloud migration history shows latest applied version is `0047_permission_levels_user_permissions` — neither 0051 nor 0052 were applied via the migration tracking system.
- The protections were applied directly (out-of-band, likely via SQL Editor or Management API).
- Helper functions `document_matches_user_permission_rules` and `filter_document_data_by_user_access` exist and work on cloud.
- `CREATE OR REPLACE` in 0052 would be a no-op since cloud already has identical code.
- File deleted from repo to prevent confusion about unapplied migrations.

### 2. Debug Leftovers Removed

| File | Reason |
|------|--------|
| `scripts/debug_browser_detail.mjs` | Throwaway DOM inspection script used during Phase 6.7.1 browser debugging |
| `scripts/debug_permissions.mjs` | Hardcoded project ref (`bhqgszzvemejfbgndtnf`), user ID, and company ID |
| `scripts/debug_db_state.mjs` | Debug script for ad-hoc DB state inspection |
| `supabase/migrations/0052_workflow_security_regression_fix.sql` | Unapplied migration (see decision above) |
| `=` (untracked) | Junk file |
| `dev-server.log` (untracked) | Development log file |

### 3. dotenv Injection Fixed

All verification scripts were missing `import dotenv from "dotenv"; dotenv.config();`. This caused `SUPABASE_ACCESS_TOKEN` and other env vars to be undefined when running from `cmd /c` or PowerShell, since `.env` is not auto-loaded by Node.js.

Fixed in:
- `scripts/verify_phase6_7_1_workflow_security_regression.mjs`
- `scripts/verify_phase6_7_workflow_docstatus_cloud.mjs`
- `scripts/verify_phase6_7_1_browser_security.mjs`
- `scripts/provision_test_users.mjs`

### 4. Results JSON Output

Added results JSON saving to the Phase 6.7.1 cloud verifier (previously missing).

## Verification Results

### Cloud Proof: 17/17 PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Admin list: full data with docstatus/workflow_state | PASS |
| 2 | Admin get: docstatus + workflow_state present | PASS |
| 3 | Admin get: level-1 fields (email, phone, notes) visible | PASS |
| 4 | Low-priv list: blocked lead excluded | PASS |
| 5 | Low-priv get blocked: document not found | PASS |
| 6 | Low-priv get: level-1 fields masked | PASS |
| 7 | Low-priv update level-1: blocked | PASS |
| 8 | Direct docstatus/workflow_state update: stripped | PASS |
| 9 | Low-priv workflow on blocked: denied | PASS |
| 10 | Low-priv workflow on allowed: draft→open | PASS |
| 11 | Admin workflow: draft→open | PASS |
| 12 | Invalid transition: open→Open rejected | PASS |
| 13 | Cancel doc: docstatus=2 | PASS |
| 14 | Update cancelled doc: rejected | PASS |
| 15 | Version timeline records workflow change | PASS |
| 16 | Version data masked: no level-1 fields | PASS |
| 17 | CRM Opportunity CRUD: create+delete OK | PASS |

Results: `C:/tmp/phase-6-7-2-cloud-proof/results.json`

### Browser Proof: 16/16 PASS

| # | Check | Result |
|---|-------|--------|
| 1 | Admin login | PASS |
| 2 | CRM Leads list loaded | PASS |
| 3 | Fresh lead created | PASS |
| 4 | Lead detail page opened | PASS |
| 5 | Docstatus badge 'Draft' visible | PASS |
| 6 | Workflow_state badge 'draft' visible | PASS |
| 7 | Admin 'Open' action button visible | PASS |
| 8 | Workflow action: UI shows 'open' | PASS |
| 9 | Docstatus still 'Draft' | PASS |
| 10 | Edit button visible (docstatus=0) | PASS |
| 11 | Document cancelled via workflow | PASS |
| 12 | Edit button visible after cancel (is_active=true) | PASS |
| 13 | Low-priv login | PASS |
| 14 | Low-priv CRM leads loaded | PASS |
| 15 | Blocked lead NOT visible | PASS |
| 16 | No page errors | PASS |

Results: `C:/tmp/phase-6-7-1-browser-security/results.json`

### Build Commands

| Command | Result |
|---------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (55 warnings, 0 errors — all pre-existing) |
| `npm run build` | PASS |
| `npm run test` | PASS (17 files, 77 tests) |
| `npm run test:simulation` | PASS (12 simulation files) |
| `node scripts/provision_test_users.mjs` | PASS |
| `node scripts/verify_phase6_7_1_workflow_security_regression.mjs` | PASS (17/17) |
| `node scripts/verify_phase6_7_1_browser_security.mjs` | PASS (16/16) |

## Remaining Gaps

- `npm run lint` reports 55 pre-existing warnings (React hooks patterns, not related to this phase).
- Vite build shows chunk-size warning (pre-existing, 845 KB main bundle).
- Phase 6.8 is NOT started.
- Report Builder is NOT started.
- Client Scripts is NOT started.
- Module Builder is NOT started.
- Purchase Orders is NOT started.
- Fleet is NOT started.
- PDF generation is NOT started.

## Files Changed in This Phase

| File | Action |
|------|--------|
| `tasks.md` | Updated (Phase 6.7.2 complete) |
| `progress.md` | Updated (Phase 6.7, 6.7.1, 6.7.2 rows) |
| `docs/ai-runs/2026-06-06_phase-6-7-2-migration-hygiene-evidence.md` | Created |
| `scripts/verify_phase6_7_1_workflow_security_regression.mjs` | Modified (dotenv, results JSON) |
| `scripts/verify_phase6_7_workflow_docstatus_cloud.mjs` | Modified (dotenv) |
| `scripts/verify_phase6_7_1_browser_security.mjs` | Modified (dotenv) |
| `scripts/provision_test_users.mjs` | Modified (dotenv) |
| `scripts/debug_browser_detail.mjs` | Deleted |
| `scripts/debug_permissions.mjs` | Deleted |
| `scripts/debug_db_state.mjs` | Deleted |
| `supabase/migrations/0052_workflow_security_regression_fix.sql` | Deleted |
