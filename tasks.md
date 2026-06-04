# Phase 6.2.1 Tasks: Secure Browser Verification Cleanup

Active branch: `phase-2.5-metadata-engine`

Goal: clean up Phase 6.2 browser verification so it is strict, repeatable, and does not commit credentials. Do not start Print Format Builder yet.

## Why this phase exists

Phase 6.2 added export/import foundation and browser verification, but the verifier committed a real email/password in `scripts/verify_phase6_export_import.mjs`.

A follow-up patch removed the hardcoded credentials from the latest file, but the password was still exposed in git history. The account password must be rotated outside the repo.

---

## A. Immediate security action

- [x] Change/rotate the exposed login password outside the repository.
- [x] Do not commit real passwords again.
- [x] Do not paste real passwords into CLI-AI prompts.
- [x] Use environment variables for browser verification.

Required local environment variables:

```bash
PLAYWRIGHT_TEST_EMAIL=your-test-email
PLAYWRIGHT_TEST_PASSWORD=your-rotated-password
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173
```

Optional:

```bash
PLAYWRIGHT_HEADLESS=false
PHASE6_EXPORT_IMPORT_OUT_DIR=C:/tmp/phase-6-2-export-import
```

---

## B. Docs

- [x] GPT review: `docs/ai-runs/2026-06-03_gpt-review-phase-6-2-export-import.md`
- [x] Create `docs/PHASE_6_2_1_SECURE_BROWSER_VERIFICATION.md`
- [x] Create `docs/ai-runs/2026-06-03_phase-6-2-1-secure-browser-verification.md`
- [x] Update `progress.md`

---

## C. Verify script cleanup

Check:

- [x] `scripts/verify_phase6_export_import.mjs` uses env vars only
- [x] script fails clearly when env vars are missing
- [x] script exits non-zero when any verification check fails
- [x] no real password remains in the latest script

Run:

```bash
node scripts/verify_phase6_export_import.mjs
```

Expected without env vars:

```text
Missing browser-test credentials...
```

Then run with env vars from local shell.

---

## D. Strengthen Playwright/Chrome DevTools verification rules

Update docs/report to require:

- [x] browser verification must use Playwright or Chrome DevTools MCP
- [x] no “manual assumed pass” allowed
- [x] screenshots or Playwright logs must be produced
- [x] script must fail non-zero on any failed check
- [x] credentials must come from local env only
- [x] final report must include exact verifier command and PASS/FAIL table

---

## E. Re-run Phase 6.2 verification securely

Using env vars, re-run browser verification:

- [x] CRM Lead Export button visible
- [x] CRM Lead Template button visible
- [x] CRM Lead Import button visible
- [x] missing required `lead_name` detected
- [x] invalid Select value detected
- [x] CRM Opportunity Export button visible
- [x] CRM Opportunity Template button visible
- [x] CRM Opportunity Import button visible
- [x] no page errors

Document output path for screenshots/results JSON.

---

## F. Commands

Run and document:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:simulation
```

---

## G. Acceptance

Phase 6.2.1 is complete only when:

- [x] exposed password has been rotated outside repo
- [x] verifier uses environment variables only
- [x] verifier fails clearly without env vars
- [x] secure verifier passes with env vars
- [x] Playwright/Chrome DevTools strict rules are documented
- [x] command results are documented
- [x] AI run report exists

After Phase 6.2.1, proceed to Phase 6.3 Print Format Foundation.
