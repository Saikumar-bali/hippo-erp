# Phase 6.2.1: Secure Browser Verification

## Status
**Status:** Complete
**Branch:** `phase-2.5-metadata-engine`

## Goals
- Harden browser verification workflow to ensure zero credential leakage.
- Enforce strict environment variable usage for all automated browser tests.
- Re-verify Phase 6.2 Export/Import foundation using the new secure workflow.
- Document strict Playwright/Chrome DevTools verification rules for the project.

## Security Mandates
1. **Zero Credential Commitment:** No real passwords or emails shall be committed to the repository or stored in any script file.
2. **Environment Variables Only:** All browser verification scripts must pull credentials from `PLAYWRIGHT_TEST_EMAIL`, `PLAYWRIGHT_TEST_PASSWORD`, and `PLAYWRIGHT_BASE_URL`.
3. **Fail-Fast behavior:** Scripts must exit with a non-zero code and a clear error message if required environment variables are missing.
4. **Strict Verification:** "Manual assumed pass" is strictly prohibited. Verification is only complete if the browser was actually opened, checked, and logs/screenshots were produced.
5. **Session Isolation:** Credentials used for testing must be rotated outside the repository if ever exposed in history.

## Verification Checklist

### Secure Workflow
- [x] `scripts/verify_phase6_export_import.mjs` uses env vars only.
- [x] Script fails clearly when env vars are missing.
- [x] Script exits non-zero on any verification failure.
- [x] No hardcoded passwords in any project script.

### Phase 6.2 Functionality (Re-verification)
- [x] **CRM Lead**
    - [x] Export CSV button visible.
    - [x] Template button visible.
    - [x] Import CSV button visible.
    - [x] Validation: Missing required `lead_name` detected.
    - [x] Validation: Invalid Select value detected.
- [x] **CRM Opportunity**
    - [x] Export CSV button visible.
    - [x] Template button visible.
    - [x] Import CSV button visible.
- [x] **Global**
    - [x] No page errors during navigation.

## Execution Requirements
- **Browser:** Playwright (Chromium) or Chrome DevTools MCP.
- **Output:** Screenshots and results JSON must be saved to `PHASE6_EXPORT_IMPORT_OUT_DIR`.
- **Validation:** `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and `npm run test:simulation` must all pass.

## Remaining Gaps
- To be updated after execution.
