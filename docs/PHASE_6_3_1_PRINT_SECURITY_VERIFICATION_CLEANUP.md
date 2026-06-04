# Phase 6.3.1 Print Security Verification Cleanup

## Goal

Complete the post-Phase-6.3 security cleanup and re-verify CRM print behavior without any committed browser-test credentials.

## Requirements

- Delete the leaked debug browser script.
- Remove committed hardcoded email/password values from scripts and reports.
- Require browser verification scripts to use only:
  - `PLAYWRIGHT_TEST_EMAIL`
  - `PLAYWRIGHT_TEST_PASSWORD`
  - `PLAYWRIGHT_BASE_URL`
  - `PLAYWRIGHT_HEADLESS`
- Ensure verification scripts exit non-zero when required checks fail.
- Re-run the Phase 6.3 print verification with Playwright.

## Cleanup Completed

- Deleted `scripts/debug_ui.mjs`.
- Removed committed hardcoded browser-test credentials from:
  - `scripts/verify_phase5_crm.mjs`
  - `scripts/verify_phase5_crm_checklist.mjs`
  - `scripts/verify_phase6_access_control.mjs`
- Sanitized browser-verification command examples in committed docs so they reference env var names only.

## Verification Hardening

- `scripts/verify_phase6_3_print.mjs` now:
  - uses env vars only
  - navigates through the live CRM sidebar flow
  - exits non-zero on failed checks
  - verifies exact required section labels
- `src/components/print/PrintPreviewPage.tsx` now:
  - parses the existing `print:doctype:id` route shape correctly
  - tolerates missing local theme RPCs
  - can render CRM built-in default layouts when tenant-specific print rows are missing
- `src/lib/print/print-format-api.ts` now:
  - attempts to self-heal missing CRM default formats for the active company
  - exposes built-in fallback layout definitions used by preview rendering

## Required Browser Checks

- CRM Lead detail shows Print button
- CRM Lead print preview opens
- Lead preview shows Lead Details, Qualification, Notes
- CRM Opportunity detail shows Print button
- CRM Opportunity print preview opens
- Opportunity preview shows Deal Details, Forecast, Notes
- Browser Print button exists
- No page errors

## Result

Phase 6.3.1 is complete when the Playwright verifier passes with the required checks above and no committed credentials remain in the repository.
