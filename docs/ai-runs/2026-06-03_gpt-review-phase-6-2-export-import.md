# GPT Review Report: Phase 6.2 Export / Import Foundation

## Branch

`phase-2.5-metadata-engine`

## Reviewed Commit

- `e5e96539ec9bb34da13bd16d8067b194f0869fc3` — Phase 6.2 browser verification + docs update

## Review Result

Phase 6.2 is mostly accepted, but the verification script contained a serious security issue that was patched immediately.

## What Is Good

Phase 6.2 added the correct platform direction:

- export/import permissions
- CRM Lead and Opportunity permission seeding
- CSV export utility
- CSV template utility
- CSV parse/validation utilities
- Import Preview dialog
- DynamicListPage export/template/import actions
- browser verification script
- docs and run report

The AI run report says migration 0044 was applied to Supabase Cloud and Playwright verification passed these checks:

- CRM Lead export button visible
- CRM Lead template button visible
- CRM Lead import button visible
- missing required `lead_name` detected
- invalid Select value detected
- CRM Opportunity export button visible
- CRM Opportunity template button visible
- CRM Opportunity import button visible

## Critical Issue Found

`scripts/verify_phase6_export_import.mjs` committed a real email and password directly in the script.

That is not acceptable. Browser verification scripts must use environment variables or local `.env` values, not committed credentials.

## Patch Applied

Follow-up commit `13799c74dba48fd2a8208f11090807b4cec4535e` updates the verifier to use:

- `PLAYWRIGHT_TEST_EMAIL`
- `PLAYWRIGHT_TEST_PASSWORD`
- `PLAYWRIGHT_BASE_URL`
- `PHASE6_EXPORT_IMPORT_OUT_DIR`
- `PLAYWRIGHT_HEADLESS`

It also fails with a clear message if credentials are missing and returns non-zero exit status if required browser checks fail.

## Required User Action

Because a password was committed to git history, rotate/change that password now. Removing it from the latest file is not enough because it still exists in repository history unless history is rewritten.

At minimum:

1. Change the account password.
2. Use local environment variables for future browser verification.
3. Do not paste real passwords into CLI-AI prompts.

## Decision

Do not proceed to Phase 6.3 yet.

Run a small Phase 6.2.1 cleanup to make browser verification strict and secure:

- rotate credential outside the repo
- update docs with secure Playwright credential rules
- verify the script works using env vars
- confirm no committed scripts contain real passwords
- rerun export/import verification

After Phase 6.2.1 passes, proceed to Phase 6.3 Print Format Foundation.
