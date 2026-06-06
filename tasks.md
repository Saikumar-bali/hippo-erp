# Phase 6.6.2 Tasks: Browser Auth Refresh Verification Gate

Status: COMPLETE

## Why this gate exists

Phase 6.6.1 fixed the AuthContext stale-closure issue and added an API-level auth refresh verifier. That is useful, but it does not prove the real user-facing bug is fixed.

The reported bug is browser/UI specific: after login, the app does not load until manual refresh.

Do not start Phase 6.7 until this browser gate passes.

## Scope

Do not start Workflow, Report Builder, Client Scripts, Module Builder, Purchase Orders, Fleet, PDF, or any new business module.

## Required work

- [x] Create or update `scripts/verify_phase6_6_2_browser_auth_refresh.mjs`.
- [x] Use Playwright or Chrome DevTools browser automation, not only Supabase JS API calls.
- [x] Open the deployed/local app while logged out.
- [x] Login as admin/owner through the real login form.
- [x] Verify the app lands on the workspace/dashboard without manual page reload.
- [x] Verify current company context is loaded after login.
- [x] Verify permission/module data is loaded after login.
- [x] Logout through the real UI.
- [x] Login as restricted user through the real login form.
- [x] Verify the restricted user lands on an allowed page without manual reload.
- [x] Verify no false Access Denied state appears during session hydration.
- [x] Verify no infinite loading state.
- [x] Save browser screenshots and results JSON.
- [x] Script must exit non-zero on failure.
- [x] Run `npm run typecheck`.
- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npm run build`.
- [x] Run `npm run test:simulation`.
- [x] Run `node scripts/verify_phase6_6_2_browser_auth_refresh.mjs`.
- [x] Update `progress.md` and AI run docs only after browser proof passes.

## Definition of done

- [x] Browser login no longer requires manual refresh.
- [x] Admin browser login passes.
- [x] Restricted browser login passes.
- [x] Screenshots/results JSON path is documented.
- [x] Final commit hash is documented.
- [x] No credentials are committed.
